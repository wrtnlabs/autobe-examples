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
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true, registered_user_id: true },
  });
  if (!article) throw new HttpException("Article not found", 404);
  if (article.registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }
  const tagMapping =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findUnique({
      where: { id: props.tagMappingId },
      select: { id: true, discussion_board_article_id: true },
    });
  if (
    !tagMapping ||
    tagMapping.discussion_board_article_id !== props.articleId
  ) {
    throw new HttpException("Tag mapping not found", 404);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_article_tag_mappings.delete({
      where: { id: props.tagMappingId },
    });
    await tx.discussion_board_audit_logs.create({
      data: {
        id: v4(),
        actor_id: props.registeredUser.id,
        event_type: "tag_mapping_deletion",
        event_description: `Deleted tag mapping ${props.tagMappingId} from article ${props.articleId}`,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });
}
