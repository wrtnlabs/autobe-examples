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

export async function patchRedditLikeMemberReportsOfComments(props: {
  member: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
  };
  body: IRedditLikeReport.IRequest;
}): Promise<IPageIRedditLikeReport.ISummary> {
  const moderatorCommunities =
    await MyGlobal.prisma.reddit_like_community_moderators.findMany({
      where: {
        reddit_like_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        reddit_like_community_id: true,
      },
    });
  const communityIds = moderatorCommunities.map(
    (m) => m.reddit_like_community_id,
  );
  if (communityIds.length === 0) {
    throw new HttpException("You are not a moderator of any community", 403);
  }
  const whereInput: Prisma.reddit_like_reportsWhereInput = {
    deleted_at: null,
    actor_type: "comment",
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.reddit_like_member_id && {
      reddit_like_member_id: props.body.reddit_like_member_id,
    }),
    commentTarget: {
      comment: {
        post: {
          reddit_like_community_id: {
            in: communityIds,
          },
        },
      },
    },
    ...(props.body.search && {
      reason: {
        contains: props.body.search,
      },
    }),
    ...(props.body.created_at_gte && {
      created_at: {
        gte: new Date(props.body.created_at_gte),
      },
    }),
    ...(props.body.created_at_lte && {
      created_at: {
        lte: new Date(props.body.created_at_lte),
      },
    }),
  } satisfies Prisma.reddit_like_reportsWhereInput;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderByInput: Prisma.reddit_like_reportsOrderByWithRelationInput = props
    .body.sort
    ? typia.createAssert<Prisma.reddit_like_reportsOrderByWithRelationInput>()({
        [props.body.sort]: props.body.order ?? "desc",
      })
    : {
        created_at: "desc",
      };
  const records = await MyGlobal.prisma.reddit_like_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditLikeReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_reports.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      RedditLikeReportAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditLikeReport.ISummary;
}
