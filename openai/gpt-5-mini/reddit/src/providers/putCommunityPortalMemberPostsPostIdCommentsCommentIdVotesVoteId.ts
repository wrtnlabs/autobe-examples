import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPortalMemberPostsPostIdCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPortalVote.IUpdate;
}): Promise<ICommunityPortalVote> {
  const { member, postId, commentId, voteId, body } = props;

  // Fetch the active vote
  const vote = await MyGlobal.prisma.community_portal_votes.findFirst({
    where: { id: voteId, deleted_at: null },
  });

  if (!vote) throw new HttpException("Not Found", 404);

  // Authorization: only the owner may update their vote
  if (vote.user_id !== member.id)
    throw new HttpException(
      "Forbidden: You are not the owner of this vote",
      403,
    );

  // Validate vote target matches path parameters
  if (vote.comment_id !== null) {
    if (vote.comment_id !== commentId)
      throw new HttpException(
        "Conflict: commentId does not match vote target",
        409,
      );
    const comment = await MyGlobal.prisma.community_portal_comments.findUnique({
      where: { id: commentId },
      select: { post_id: true },
    });
    if (!comment || comment.post_id !== postId)
      throw new HttpException("Not Found", 404);
  } else if (vote.post_id !== null) {
    if (vote.post_id !== postId)
      throw new HttpException(
        "Conflict: postId does not match vote target",
        409,
      );
    // For post-targeted votes, the route's commentId is not applicable and treated as conflict
    if (commentId)
      throw new HttpException(
        "Conflict: vote targets post but commentId provided in path",
        409,
      );
  } else {
    throw new HttpException("Not Found", 404);
  }

  // Prepare timestamp and update only allowed fields
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.community_portal_votes.update({
    where: { id: voteId },
    data: {
      ...(body.value !== undefined && { value: body.value }),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    user_id: updated.user_id,
    post_id: updated.post_id === null ? null : updated.post_id,
    comment_id: updated.comment_id === null ? null : updated.comment_id,
    value: updated.value as 1 | -1,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
