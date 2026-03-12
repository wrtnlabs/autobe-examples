import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleSnapshotTransformer } from "../transformers/DiscussionBoardArticleSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardArticlesArticleIdSnapshots(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleSnapshot> {
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: {
        id: true,
        title: true,
        content: true,
        discussion_board_section_id: true,
        discussion_board_member_id: true,
        deleted_at: true,
      },
    });
  if (article.deleted_at !== null) {
    throw new HttpException("Article has been deleted", 400);
  }
  const snapshot =
    await MyGlobal.prisma.discussion_board_article_snapshots.create({
      data: {
        id: v4(),
        discussion_board_article_id: article.id,
        discussion_board_member_id: article.discussion_board_member_id,
        discussion_board_section_id: article.discussion_board_section_id,
        title: article.title,
        content: article.content,
        created_at: new Date(),
      },
      ...DiscussionBoardArticleSnapshotTransformer.select(),
    });
  return await DiscussionBoardArticleSnapshotTransformer.transform(snapshot);
}
