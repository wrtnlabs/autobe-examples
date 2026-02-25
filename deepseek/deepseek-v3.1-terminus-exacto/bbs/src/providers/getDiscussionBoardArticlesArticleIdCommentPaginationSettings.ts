import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardCommentPaginationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentPaginationSetting";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentPaginationSettingTransformer } from "../transformers/DiscussionBoardCommentPaginationSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdCommentPaginationSettings(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentPaginationSetting> {
  // First verify the article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Query the pagination settings
  const settings =
    await MyGlobal.prisma.discussion_board_comment_pagination_settings.findUnique(
      {
        where: { discussion_board_article_id: props.articleId },
        ...DiscussionBoardCommentPaginationSettingTransformer.select(),
      },
    );
  if (!settings) {
    throw new HttpException(
      "Pagination settings not found for this article",
      404,
    );
  }
  return await DiscussionBoardCommentPaginationSettingTransformer.transform(
    settings,
  );
}
