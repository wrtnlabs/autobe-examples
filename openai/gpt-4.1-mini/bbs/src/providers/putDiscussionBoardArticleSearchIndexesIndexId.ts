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

export async function putDiscussionBoardArticleSearchIndexesIndexId(props: {
  indexId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleSearchIndex.IUpdate;
}): Promise<IDiscussionBoardArticleSearchIndex> {
  const existing =
    await MyGlobal.prisma.discussion_board_article_search_indexes.findUnique({
      where: { id: props.indexId },
    });
  if (!existing) throw new HttpException("Article search index not found", 404);
  const updatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.discussion_board_article_search_indexes.update({
      where: { id: props.indexId },
      data: { updated_at: updatedAt },
    });
  });
  return updated;
}
