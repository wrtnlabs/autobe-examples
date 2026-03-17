import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformPostVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostVoteSnapshotTransformer } from "../transformers/CommunityPlatformPostVoteSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberPostsPostIdVotesVoteIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVoteSnapshot> {
  // Step 1: Verify snapshot exists and belongs to specified vote and post
  const snapshot =
    await MyGlobal.prisma.community_platform_post_vote_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          community_platform_post_vote_id: props.voteId,
          post: {
            id: props.postId,
          },
        },
        ...CommunityPlatformPostVoteSnapshotTransformer.select(),
      },
    );
  // Step 2: Check authorization - member is the voter
  if (snapshot.member.id === props.member.id) {
    return await CommunityPlatformPostVoteSnapshotTransformer.transform(
      snapshot,
    );
  }
  // Step 3: If not the voter, check moderator status
  // Need to verify if member is a moderator of the post's community
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_community_id: true,
      },
    },
  );
  // Check if member is a moderator in this community
  const moderatorRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_community_id: post.community_platform_community_id,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!moderatorRole) {
    throw new HttpException("Forbidden", 403);
  }
  // Member is a moderator, allow access
  return await CommunityPlatformPostVoteSnapshotTransformer.transform(snapshot);
}
