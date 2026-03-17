import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformReportAtSummaryTransformer } from "../transformers/RedditPlatformReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberCommunitiesCommunityIdReports(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformReport.IRequest;
}): Promise<IPageIRedditPlatformReport.ISummary> {
  // 1. Validate community exists and is not deleted
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
      select: { id: true, deleted_at: true },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  if (community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Verify member is moderator of the community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        reddit_platform_community_id: props.communityId,
        reddit_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (moderatorAssignment === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate status filter if provided
  const validStatuses = ["pending", "approved", "dismissed"];
  if (
    props.body.status !== undefined &&
    !validStatuses.includes(props.body.status)
  ) {
    throw new HttpException("Invalid status value", 400);
  }
  // 4. Build where clause
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_reportsWhereInput = {
    deleted_at: null,
    // Reports must be for content in this community
    AND: [
      {
        OR: [
          // Post reports - post must be in community
          {
            post: {
              community_id: props.communityId,
            },
          },
          // Comment reports - comment's post must be in community
          {
            comment: {
              post: {
                community_id: props.communityId,
              },
            },
          },
        ],
      },
    ],
  };
  // Apply status filter
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  } else {
    // Default to pending if not specified
    whereInput.status = "pending";
  }
  // Apply date range filters
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    whereInput.created_at = {};
    if (props.body.created_at_from !== undefined) {
      whereInput.created_at.gte = new Date(props.body.created_at_from);
    }
    if (props.body.created_at_to !== undefined) {
      whereInput.created_at.lte = new Date(props.body.created_at_to);
    }
  }
  // 5. Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_reports.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditPlatformReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_reports.count({
      where: whereInput,
    }),
  ]);
  // 6. Transform and return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformReportAtSummaryTransformer.transform,
    ),
  };
}
