import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardRegisteredUserArticlesArticleId(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true, registered_user_id: true },
  });
  if (!article) {
    throw new HttpException("Not Found", 404);
  }
  if (article.registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.discussion_board_articles.delete({
    where: { id: props.articleId },
  });
}
