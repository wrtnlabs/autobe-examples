import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityBBSAdminPostsPostIdCommentsCommentId(props: {
  admin: AdminPayload;
  postId: string;
  commentId: string;
}): Promise<void> {
  const deleted = await MyGlobal.prisma.community_bbs_comments.delete({
    where: {
      id: props.commentId,
      post_id: props.postId,
    },
  });

  if (!deleted) {
    throw new HttpException("Comment not found", 404);
  }
}
