import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformPostVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostVoteSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformPostVoteSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberPostsPostIdVotesVoteIdSnapshots(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVoteSnapshot.IRequest;
}): Promise<IPageICommunityPlatformPostVoteSnapshot.ISummary> {
  // 1. Verify post exists and get author/community for auth
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_member_id: true,
        community_platform_community_id: true,
      },
    },
  );
  // 2. Verify vote exists and get owner for auth
  const vote =
    await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      select: {
        id: true,
        community_platform_member_id: true,
      },
    });
  // 3. Authorization check
  const isPostAuthor = post.community_platform_member_id === props.member.id;
  const isVoteOwner = vote.community_platform_member_id === props.member.id;
  let isCommunityModerator = false;
  if (!isPostAuthor && !isVoteOwner) {
    const moderatorRole =
      await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
        where: {
          community_platform_member_id: props.member.id,
          community_platform_community_id: post.community_platform_community_id,
          deleted_at: null,
        },
      });
    isCommunityModerator = moderatorRole !== null;
  }
  if (!isPostAuthor && !isVoteOwner && !isCommunityModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Build where clause
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    community_platform_post_id: props.postId,
    community_platform_post_vote_id: props.voteId,
    ...(props.body.snapshot_reason !== undefined &&
      props.body.snapshot_reason !== null && {
        snapshot_reason: props.body.snapshot_reason,
      }),
    ...(props.body.karma_impact_min !== undefined && {
      karma_impact: { gte: props.body.karma_impact_min },
    }),
    ...(props.body.karma_impact_max !== undefined && {
      karma_impact: { lte: props.body.karma_impact_max },
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.search !== undefined && {
      snapshot_reason: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.community_platform_post_vote_snapshotsWhereInput;
  // 5. Determine sort order
  let orderByInput: Prisma.community_platform_post_vote_snapshotsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "created_at_asc":
      orderByInput = { created_at: "asc" as const };
      break;
    case "karma_impact_desc":
      orderByInput = { karma_impact: "desc" as const };
      break;
    case "karma_impact_asc":
      orderByInput = { karma_impact: "asc" as const };
      break;
    default: // created_at_desc
      orderByInput = { created_at: "desc" as const };
  }
  // 6. Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_vote_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformPostVoteSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_post_vote_snapshots.count({
      where: whereInput,
    }),
  ]);
  // 7. Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformPostVoteSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
