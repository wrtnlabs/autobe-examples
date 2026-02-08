import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
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

export async function getDiscussionBoardRegisteredUserArticlesArticleIdTagMappingsTagMappingId(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  tagMappingId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleTagMapping> {
  const record =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findUnique({
      where: { id: props.tagMappingId },
      select: {
        id: true,
        discussion_board_article_id: true,
        discussion_board_tag_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (
    record === null ||
    record.discussion_board_article_id !== props.articleId
  ) {
    throw new HttpException("Tag mapping not found", 404);
  }
  return {
    id: record.id,
    discussion_board_article_id: record.discussion_board_article_id,
    discussion_board_tag_id: record.discussion_board_tag_id,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
