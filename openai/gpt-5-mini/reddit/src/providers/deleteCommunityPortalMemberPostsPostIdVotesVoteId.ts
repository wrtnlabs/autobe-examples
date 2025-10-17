import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPortalMemberPostsPostIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId, voteId } = props;

  // Verify vote exists and is active
  const vote = await MyGlobal.prisma.community_portal_votes.findUnique({
    where: { id: voteId },
  });
  if (!vote || vote.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (vote.post_id !== postId) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: only owner can delete
  if (vote.user_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own vote",
      403,
    );
  }

  // Verify post exists
  const post = await MyGlobal.prisma.community_portal_posts.findUnique({
    where: { id: postId },
  });
  if (!post) {
    throw new HttpException("Not Found", 404);
  }

  const now = toISOStringSafe(new Date());

  // Atomic update: soft-delete the vote and adjust author karma if applicable
  try {
    await MyGlobal.prisma.$transaction(async (prisma) => {
      const updated = await prisma.community_portal_votes.updateMany({
        where: { id: voteId, deleted_at: null },
        data: { deleted_at: now, updated_at: now },
      });

      if (updated.count === 0) {
        throw new HttpException(
          "Conflict: vote already deleted or modified",
          409,
        );
      }

      if (post.author_user_id) {
        await prisma.community_portal_users.update({
          where: { id: post.author_user_id },
          data: { karma: { decrement: vote.value } },
        });
      }
    });
  } catch (e) {
    if (e instanceof HttpException) throw e;
    throw new HttpException("Internal Server Error", 500);
  }

  // Emit domain event if available (best-effort, non-blocking)
  try {
    const globalAny = MyGlobal as unknown as {
      event?: { emit?: (...args: any[]) => void };
    };
    if (typeof globalAny.event?.emit === "function") {
      globalAny.event.emit("vote.deleted", { postId, voteId, deleted_at: now });
    }
  } catch (e) {
    // swallow event errors
  }

  return;
}
