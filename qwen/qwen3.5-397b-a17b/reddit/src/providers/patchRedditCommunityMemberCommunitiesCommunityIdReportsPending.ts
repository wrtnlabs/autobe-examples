import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityReportAtSummaryTransformer } from "../transformers/RedditCommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberCommunitiesCommunityIdReportsPending(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: props.communityId },
      select: { id: true, deleted_at: true },
    });
  if (!community || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        reddit_community_member_id: props.member.id,
        reddit_community_community_id: props.communityId,
        deleted_at: null,
      },
    },
  );
  if (!moderator) {
    throw new HttpException(
      "Forbidden - not a moderator of this community",
      403,
    );
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_reportsWhereInput = {
    status: "pending",
    deleted_at: null,
    OR: [
      {
        reportOfPost: {
          post: {
            reddit_community_community_id: props.communityId,
            deleted_at: null,
          },
        },
      },
      {
        reportOfComment: {
          comment: {
            post: {
              reddit_community_community_id: props.communityId,
              deleted_at: null,
            },
          },
        },
      },
    ],
  };
  const orderByInput: Prisma.reddit_community_reportsOrderByWithRelationInput =
    props.body.sort === "resolved_at"
      ? { resolved_at: props.body.order === "asc" ? "asc" : "desc" }
      : { created_at: props.body.order === "asc" ? "asc" : "desc" };
  const records = await MyGlobal.prisma.reddit_community_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_reports.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCommunityReportAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityReport.ISummary;
}
