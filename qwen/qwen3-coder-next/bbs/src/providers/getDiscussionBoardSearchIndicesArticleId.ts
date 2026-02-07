import { IDiscussionBoardSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchIndex";
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

export async function getDiscussionBoardSearchIndicesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSearchIndex> {
  const searchIndex =
    await MyGlobal.prisma.discussion_board_search_indices.findFirst({
      where: { article_id: props.articleId },
    });
  if (!searchIndex) {
    throw new HttpException(
      "Search index not found for the given article",
      404,
    );
  }
  return {
    id: searchIndex.id,
    article_id: searchIndex.article_id,
    title: searchIndex.title,
    content: searchIndex.content,
    title_trgm: searchIndex.title_trgm,
    content_trgm: searchIndex.content_trgm,
    created_at: toISOStringSafe(searchIndex.created_at),
    updated_at: toISOStringSafe(searchIndex.updated_at),
    deleted_at: searchIndex.deleted_at
      ? toISOStringSafe(searchIndex.deleted_at)
      : null,
  };
}
