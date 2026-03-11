import { IDiscussionBoardArticleMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleMetadatumTransformer } from "../transformers/DiscussionBoardArticleMetadatumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdMetadata(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleMetadatum> {
  // First ensure article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Get metadata with transformer, using discussion_board_article_id as unique identifier
  const metadata =
    await MyGlobal.prisma.discussion_board_article_metadata.findUniqueOrThrow({
      where: {
        discussion_board_article_id: props.articleId,
      } satisfies Prisma.discussion_board_article_metadataWhereUniqueInput,
      ...DiscussionBoardArticleMetadatumTransformer.select(),
    });
  return await DiscussionBoardArticleMetadatumTransformer.transform(metadata);
}
