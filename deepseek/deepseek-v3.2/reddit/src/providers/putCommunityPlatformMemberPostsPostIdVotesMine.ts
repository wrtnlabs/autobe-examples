import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostVoteCollector } from "../collectors/CommunityPlatformPostVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostVoteTransformer } from "../transformers/CommunityPlatformPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberPostsPostIdVotesMine(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  // Verify post exists
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
    },
  );
  // Find existing vote
  const existingVote =
    await MyGlobal.prisma.community_platform_post_votes.findUnique({
      where: {
        community_platform_member_id_community_platform_post_id: {
          community_platform_member_id: props.member.id,
          community_platform_post_id: props.postId,
        },
      },
    });
  // Calculate karma adjustment based on vote change
  const oldType = existingVote?.type ?? null;
  const newType = props.body.type ?? null;
  // Determine karma adjustment: upvote=+1, downvote=-1
  const oldKarma = oldType === "up" ? 1 : oldType === "down" ? -1 : 0;
  const newKarma = newType === "up" ? 1 : newType === "down" ? -1 : 0;
  const karmaAdjustment = newKarma - oldKarma;
  // Prepare vote data using Collector
  const voteData = await CommunityPlatformPostVoteCollector.collect({
    body: { type: props.body.type ?? null },
    member: { id: props.member.id },
    post: { id: props.postId },
  });
  // Execute atomic transaction
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Upsert vote
    const vote = await prisma.community_platform_post_votes.upsert({
      where: {
        community_platform_member_id_community_platform_post_id: {
          community_platform_member_id: props.member.id,
          community_platform_post_id: props.postId,
        },
      },
      update: {
        type: voteData.type,
        updated_at: voteData.updated_at,
        deleted_at: voteData.deleted_at,
      },
      create: voteData,
      ...CommunityPlatformPostVoteTransformer.select(),
    });
    // Adjust karma if needed
    if (karmaAdjustment !== 0) {
      await prisma.community_platform_karmas.updateMany({
        where: {
          member_id: post.community_platform_member_id,
        },
        data: {
          score: { increment: karmaAdjustment },
          updated_at: new Date(),
        },
      });
    }
    return vote;
  });
  return await CommunityPlatformPostVoteTransformer.transform(result);
}
