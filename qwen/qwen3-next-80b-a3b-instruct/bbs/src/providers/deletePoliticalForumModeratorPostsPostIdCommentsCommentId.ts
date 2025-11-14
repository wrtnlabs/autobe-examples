import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumComment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deletePoliticalForumModeratorPostsPostIdCommentsCommentId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IPoliticalForumComment> {
  const deletedComment = await MyGlobal.prisma.political_forum_comments.delete({
    where: {
      id: props.commentId,
      post_id: props.postId,
    },
  });

  if (!deletedComment) {
    throw new HttpException("Comment not found", 404);
  }

  return deletedComment.id;
}
