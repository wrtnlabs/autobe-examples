import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleVersion";

export async function getDiscussionBoardArticlesArticleIdVersionsVersionId(props: {
  articleId: string & tags.Format<"uuid">;
  versionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleVersion> {
  const version =
    await MyGlobal.prisma.discussion_board_article_versions.findFirst({
      where: {
        id: props.versionId,
        article_id: props.articleId,
      },
    });

  if (!version) {
    throw new HttpException("Article version not found", 404);
  }

  return {
    articleId: version.article_id,
    content: version.content,
    createdAt: toISOStringSafe(version.created_at),
    id: version.id,
  };
}
