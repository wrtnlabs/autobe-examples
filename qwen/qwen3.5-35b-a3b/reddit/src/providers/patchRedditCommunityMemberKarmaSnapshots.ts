import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityKarmaSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityKarmaSnapshot";
import { IRedditCommunityKarmaSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaSnapshot";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityKarmaSnapshotAtSummaryTransformer } from "../transformers/RedditCommunityKarmaSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberKarmaSnapshots(props: {
  member: MemberPayload;
  body: IRedditCommunityKarmaSnapshot.IRequest;
}): Promise<IPageIRedditCommunityKarmaSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_karma_snapshotsWhereInput = {
    deleted_at: null,
    ...(props.body.user_id && {
      reddit_community_user_id: props.body.user_id,
    }),
    ...(props.body.vote_id && {
      reddit_community_vote_id: props.body.vote_id,
    }),
    ...(props.body.karma_delta !== undefined && {
      karma_delta: props.body.karma_delta,
    }),
    created_at: {
      ...(props.body.created_at_start && {
        gte: new Date(props.body.created_at_start),
      }),
      ...(props.body.created_at_end && {
        lte: new Date(props.body.created_at_end),
      }),
      ...(props.body.cursor && {
        lt: new Date(props.body.cursor),
      }),
    },
  } satisfies Prisma.reddit_community_karma_snapshotsWhereInput;
  const orderByInput = (
    props.body.sort === "karma_delta"
      ? {
          karma_delta: (props.body.order ?? "desc") as "asc" | "desc",
        }
      : {
          created_at: (props.body.order ?? "desc") as "asc" | "desc",
        }
  ) satisfies Prisma.reddit_community_karma_snapshotsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_community_karma_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit + 1,
    orderBy: [orderByInput, { id: "asc" }],
    ...RedditCommunityKarmaSnapshotAtSummaryTransformer.select(),
  });
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  const total = await MyGlobal.prisma.reddit_community_karma_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      items,
      RedditCommunityKarmaSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
