import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdImages(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.IUpdate;
}): Promise<IDiscussionBoardArticle.ISummary> {
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (props.body.remove && props.body.remove.length > 0) {
      await tx.discussion_board_article_images.updateMany({
        where: {
          id: { in: props.body.remove },
          discussion_board_article_id: props.articleId,
          deleted_at: null,
        },
        data: {
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }
    if (props.body.add && props.body.add.length > 0) {
      await tx.discussion_board_article_images.createMany({
        data: props.body.add.map((image) => ({
          id: v4(),
          discussion_board_article_id: props.articleId,
          name: image.name,
          size: image.size,
          type: image.type,
          url: image.url,
          width: image.width,
          height: image.height,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        })),
      });
    }
  });
  const updated =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      ...DiscussionBoardArticleAtSummaryTransformer.select(),
    });
  return await DiscussionBoardArticleAtSummaryTransformer.transform(updated);
}
