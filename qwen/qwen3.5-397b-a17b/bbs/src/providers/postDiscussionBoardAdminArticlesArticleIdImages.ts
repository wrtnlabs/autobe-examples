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
import { DiscussionBoardArticleImageCollector } from "../collectors/DiscussionBoardArticleImageCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleImageTransformer } from "../transformers/DiscussionBoardArticleImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminArticlesArticleIdImages(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.ICreate;
}): Promise<IDiscussionBoardArticleImage> {
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId, deleted_at: null },
  });
  const image = await MyGlobal.prisma.discussion_board_article_images.create({
    data: await DiscussionBoardArticleImageCollector.collect({
      body: props.body,
      discussionBoardArticles: { id: props.articleId },
    }),
    ...DiscussionBoardArticleImageTransformer.select(),
  });
  return await DiscussionBoardArticleImageTransformer.transform(image);
}
