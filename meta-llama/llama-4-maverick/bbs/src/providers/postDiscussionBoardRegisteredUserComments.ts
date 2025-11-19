import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function postDiscussionBoardRegisteredUserComments(props: {
  registeredUser: RegisteredUserPayload;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  const now = toISOStringSafe(new Date());
  const commentId = v4() as string & tags.Format<"uuid">;

  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.body.discussion_board_article_id },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  try {
    const created = await MyGlobal.prisma.discussion_board_comments.create({
      data: {
        id: commentId,
        content: props.body.content,
        discussion_board_article_id: props.body.discussion_board_article_id,
        discussion_board_user_id: props.registeredUser.id,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: created.id,
      content: created.content,
      discussion_board_article_id: created.discussion_board_article_id,
      discussion_board_user_id: created.discussion_board_user_id,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (error) {
    throw new HttpException("Failed to create comment", 500);
  }
}
