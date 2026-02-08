import { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticleSearchIndexesIndexId(props: {
  indexId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleSearchIndex.IArticleSearchIndex> {
  const record =
    await MyGlobal.prisma.discussion_board_article_search_indexes.findUnique({
      where: { id: props.indexId },
      select: {
        id: true,
        discussion_board_article_id: true,
        title: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record) {
    throw new HttpException("Article search index not found", 404);
  }
  return {
    id: record.id,
    article_id: record.discussion_board_article_id,
    title: record.title,
    body: record.body,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
