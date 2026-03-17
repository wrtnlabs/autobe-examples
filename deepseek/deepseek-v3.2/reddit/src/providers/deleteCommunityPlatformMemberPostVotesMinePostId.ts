import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteCommunityPlatformMemberPostVotesMinePostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Check if post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId, deleted_at: null },
      select: {
        id: true,
        community_platform_member_id: true,
        community_platform_community_id: true,
      },
    },
  );
  // 2. Check if vote exists for this member-post pair
  const vote = await MyGlobal.prisma.community_platform_post_votes.findFirst({
    where: {
      community_platform_member_id: props.member.id,
      community_platform_post_id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      type: true,
      community_platform_post_id: true,
      community_platform_member_id: true,
    },
  });
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  // 3. Get the author's current karma for adjustment
  const authorKarma =
    await MyGlobal.prisma.community_platform_karmas.findUnique({
      where: { member_id: post.community_platform_member_id },
      select: { id: true, score: true },
    });
  if (!authorKarma) {
    throw new HttpException("Author karma record not found", 404);
  }
  // 4. Calculate karma adjustment: +1 for upvote removal, -1 for downvote removal
  const karmaAdjustment =
    vote.type === "up" ? -1 : vote.type === "down" ? 1 : 0;
  // 5. Execute transaction: delete vote, update karma
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Delete the vote (cascade will handle snapshots)
    await prisma.community_platform_post_votes.delete({
      where: { id: vote.id },
    });
    // Update author's karma
    await prisma.community_platform_karmas.update({
      where: { id: authorKarma.id },
      data: {
        score: authorKarma.score + karmaAdjustment,
        updated_at: new Date(),
      },
    });
  });
}
