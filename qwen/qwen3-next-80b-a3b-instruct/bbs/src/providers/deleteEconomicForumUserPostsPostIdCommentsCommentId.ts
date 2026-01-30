import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteEconomicForumUserPostsPostIdCommentsCommentId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.economic_forum_post_comments.findUnique({
      where: {
        id: props.commentId,
        post: {
          id: props.postId,
        },
      },
    });
  if (!existing) {
    throw new HttpException(
      "Comment not found or does not belong to specified post",
      404,
    );
  }
  await MyGlobal.prisma.economic_forum_post_comments.delete({
    where: {
      id: props.commentId,
      post: {
        id: props.postId,
      },
    },
  });
}
