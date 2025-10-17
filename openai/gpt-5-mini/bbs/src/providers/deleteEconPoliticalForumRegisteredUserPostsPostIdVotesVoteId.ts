import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function deleteEconPoliticalForumRegisteredUserPostsPostIdVotesVoteId(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { registeredUser, postId, voteId } = props;

  const vote = await MyGlobal.prisma.econ_political_forum_votes.findUnique({
    where: { id: voteId },
    select: {
      id: true,
      registereduser_id: true,
      post_id: true,
      deleted_at: true,
    },
  });

  if (!vote) throw new HttpException("Not Found", 404);

  if (vote.post_id !== postId) {
    throw new HttpException(
      "Bad Request: vote does not belong to the specified post",
      400,
    );
  }

  // Idempotent: if already soft-deleted, succeed
  if (vote.deleted_at) return;

  // Authorization: only the vote owner may remove their vote
  if (vote.registereduser_id !== registeredUser.id) {
    throw new HttpException(
      "Unauthorized: Only the vote owner can delete this vote",
      403,
    );
  }

  // Verify the post exists
  const post = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
    where: { id: postId },
    select: { id: true },
  });
  if (!post) throw new HttpException("Not Found", 404);

  // Check for active legal holds preventing deletion
  const legalHold =
    await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
      where: { post_id: postId, is_active: true },
      select: { id: true },
    });
  if (legalHold) {
    throw new HttpException(
      "Conflict: Legal hold prevents deletion of content for this post",
      423,
    );
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.econ_political_forum_votes.update({
      where: { id: voteId },
      data: { deleted_at: now, updated_at: now },
    }),
    MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        registereduser_id: registeredUser.id,
        post_id: postId,
        action_type: "delete_vote",
        target_type: "vote",
        target_identifier: voteId,
        details: `User ${registeredUser.id} soft-deleted vote ${voteId}`,
        created_at: now,
        created_by_system: false,
      },
    }),
  ]);
}
