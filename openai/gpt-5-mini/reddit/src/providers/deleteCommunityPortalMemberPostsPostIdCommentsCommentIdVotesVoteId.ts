import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPortalMemberPostsPostIdCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId, commentId, voteId } = props;
  const vote = await MyGlobal.prisma.community_portal_votes.findUnique({
    where: { id: voteId },
  });
  if (!vote) throw new HttpException("Not Found", 404);
  if (vote.deleted_at !== null)
    throw new HttpException("Conflict: Vote already deleted", 409);
  if (vote.user_id !== member.id)
    throw new HttpException(
      "Unauthorized: Only the vote owner can delete this vote",
      403,
    );
  if (vote.post_id !== postId || vote.comment_id !== commentId)
    throw new HttpException("Not Found", 404);
  await MyGlobal.prisma.community_portal_votes.update({
    where: { id: voteId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
