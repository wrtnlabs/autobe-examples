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

export async function deleteDiscussionBoardRegisteredUserArticlesArticleIdTagMappingsTagMappingId(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  tagMappingId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check article ownership or admin role
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true, registered_user_id: true },
  });
  if (!article) {
    throw new HttpException("Not Found", 404);
  }
  const isOwner = article.registered_user_id === props.registeredUser.id;
  // Assuming admin privileges excluded as actor is registeredUser only
  if (!isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the tag mapping exists and linked to the article
  const tagMapping =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findUnique({
      where: { id: props.tagMappingId },
      select: { id: true, discussion_board_article_id: true },
    });
  if (
    !tagMapping ||
    tagMapping.discussion_board_article_id !== props.articleId
  ) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.discussion_board_article_tag_mappings.delete({
    where: { id: props.tagMappingId },
  });
}
