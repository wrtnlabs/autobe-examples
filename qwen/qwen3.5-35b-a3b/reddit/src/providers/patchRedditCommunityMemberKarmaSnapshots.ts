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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberKarmaSnapshots(props: {
  member: MemberPayload;
  body: IRedditCommunityKarmaSnapshot.IRequest;
}): Promise<IPageIRedditCommunityKarmaSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  // Build where clause
  const where: Prisma.reddit_community_karma_snapshotsWhereInput = {
    deleted_at: null,
    ...(props.body.user_id && { reddit_community_user_id: props.body.user_id }),
    ...(props.body.vote_id && { reddit_community_vote_id: props.body.vote_id }),
    ...(props.body.karma_delta !== undefined && {
      karma_delta: props.body.karma_delta,
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
  } satisfies Prisma.reddit_community_karma_snapshotsWhereInput;
  // Build order by clause
  const orderDirection: "asc" | "desc" = props.body.order ?? "desc";
  const orderBy: Prisma.reddit_community_karma_snapshotsOrderByWithRelationInput =
    props.body.sort === "karma_delta"
      ? { karma_delta: orderDirection }
      : { created_at: orderDirection };
  // Execute findMany
  const data = await MyGlobal.prisma.reddit_community_karma_snapshots.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          created_at: true,
        },
      },
      vote: {
        include: {
          member: {
            select: {
              id: true,
              username: true,
              created_at: true,
            },
          },
        },
        select: {
          id: true,
          vote_type: true,
          created_at: true,
        },
      },
    },
  });
  // Execute count
  const total = await MyGlobal.prisma.reddit_community_karma_snapshots.count({
    where,
  });
  // Transform to response format
  const transformedData = await ArrayUtil.asyncMap(data, async (snapshot) => {
    return {
      id: snapshot.id,
      user: {
        id: snapshot.user.id,
        username: snapshot.user.username,
        created_at: toISOStringSafe(snapshot.user.created_at),
      },
      vote: {
        id: snapshot.vote.id,
        vote_type: typia.assert<"upvote" | "downvote">(snapshot.vote.vote_type),
        created_at: toISOStringSafe(snapshot.vote.created_at),
        member: {
          id: snapshot.vote.member.id,
          username: snapshot.vote.member.username,
          created_at: toISOStringSafe(snapshot.vote.member.created_at),
        },
      },
      karma_delta: snapshot.karma_delta,
      karma_after_change: snapshot.karma_after_change,
      created_at: toISOStringSafe(snapshot.created_at),
      updated_at: toISOStringSafe(snapshot.updated_at),
      deleted_at: snapshot.deleted_at
        ? toISOStringSafe(snapshot.deleted_at)
        : null,
    };
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  } satisfies IPageIRedditCommunityKarmaSnapshot.ISummary;
}
