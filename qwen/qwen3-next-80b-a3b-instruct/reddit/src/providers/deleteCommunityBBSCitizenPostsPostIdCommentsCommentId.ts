import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function deleteCommunityBBSCitizenPostsPostIdCommentsCommentId(props: {
  citizen: CitizenPayload;
  postId: string;
  commentId: string;
}): Promise<void> {
  // Fetch the comment with its citizen_id and ensure it's not deleted
  const comment = await MyGlobal.prisma.community_bbs_comments.findUnique({
    where: {
      id: props.commentId,
      post_id: props.postId,
      deleted_at: null,
    },
  });

  // If comment doesn't exist, is deleted, or doesn't belong to the post, throw 404
  if (!comment) {
    throw new HttpException("Not found", 404);
  }

  // Verify the authenticated citizen is the author of the comment
  if (comment.citizen_id !== props.citizen.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Perform hard delete - no soft delete (deleted_at is ignored)
  await MyGlobal.prisma.community_bbs_comments.delete({
    where: {
      id: props.commentId,
    },
  });
}
