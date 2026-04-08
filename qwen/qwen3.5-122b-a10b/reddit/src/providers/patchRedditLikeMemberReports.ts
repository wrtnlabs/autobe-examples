import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeReportAtSummaryTransformer } from "../transformers/RedditLikeReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberReports(props: {
  member: MemberPayload;
  body: IRedditLikeReport.IRequest;
}): Promise<IPageIRedditLikeReport.ISummary> {
  // Step 1: Get all communities where the member has moderator privileges
  const moderatorRecords =
    await MyGlobal.prisma.reddit_like_community_moderators.findMany({
      where: {
        reddit_like_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        reddit_like_community_id: true,
      },
    });
  const communityIds = moderatorRecords.map(
    (r) => r.reddit_like_community_id as string & tags.Format<"uuid">,
  );
  if (communityIds.length === 0) {
    throw new HttpException("You are not a moderator of any community", 403);
  }
  // Step 2: Build where clause for reports
  const whereInput: Prisma.reddit_like_reportsWhereInput = {
    deleted_at: null,
    ...(props.body.reddit_like_member_id && {
      reddit_like_member_id: props.body.reddit_like_member_id,
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.search && {
      reason: {
        contains: props.body.search,
      },
    }),
    ...(props.body.created_at_gte && {
      created_at: {
        gte: props.body.created_at_gte,
      },
    }),
    ...(props.body.created_at_lte && {
      created_at: {
        lte: props.body.created_at_lte,
      },
    }),
    OR: [
      {
        postTarget: {
          post: {
            reddit_like_community_id: {
              in: communityIds,
            },
          },
        },
      },
      {
        commentTarget: {
          comment: {
            post: {
              reddit_like_community_id: {
                in: communityIds,
              },
            },
          },
        },
      },
    ],
  } satisfies Prisma.reddit_like_reportsWhereInput;
  // Step 3: Build order by clause
  const orderByInput: Prisma.reddit_like_reportsOrderByWithRelationInput[] = [];
  if (props.body.sort) {
    const order = props.body.order === "asc" ? "asc" : "desc";
    orderByInput.push({ [props.body.sort]: order });
  } else {
    orderByInput.push({ created_at: "desc" });
  }
  // Step 4: Apply pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Step 5: Fetch paginated records
  const records = await MyGlobal.prisma.reddit_like_reports.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditLikeReportAtSummaryTransformer.select(),
  });
  // Step 6: Get total count
  const total = await MyGlobal.prisma.reddit_like_reports.count({
    where: whereInput,
  });
  // Step 7: Transform and return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditLikeReportAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditLikeReport.ISummary;
}
