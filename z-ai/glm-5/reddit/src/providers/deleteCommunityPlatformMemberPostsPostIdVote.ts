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

export async function deleteCommunityPlatformMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the vote record with post author info
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: {
      post_id_member_id: {
        post_id: props.postId,
        member_id: props.member.id,
      },
    },
    select: {
      id: true,
      vote_type: true,
      post: {
        select: { author_id: true },
      },
    },
  });
  if (vote === null) {
    throw new HttpException("Vote not found", 404);
  }
  // Delete the vote
  await MyGlobal.prisma.community_platform_post_votes.delete({
    where: { id: vote.id },
  });
  // Update author's karma based on removed vote type
  // Upvote removal: decrease karma by 1 (author loses the benefit)
  // Downvote removal: increase karma by 1 (author regains what they lost)
  await MyGlobal.prisma.community_platform_members.update({
    where: { id: vote.post.author_id },
    data: {
      karma: vote.vote_type === "upvote" ? { decrement: 1 } : { increment: 1 },
    },
  });
}
