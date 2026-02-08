import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleImageCollector } from "../collectors/DiscussionBoardArticleImageCollector";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardRegisteredUserArticlesArticleIdImages(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.ICreate;
}): Promise<IDiscussionBoardArticleImage> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true, registered_user_id: true },
  });
  if (!article) throw new HttpException("Article not found", 404);
  if (article.registered_user_id !== props.registeredUser.id) {
    const isAdmin =
      await MyGlobal.prisma.discussion_board_administrators.findUnique({
        where: { id: props.registeredUser.id },
        select: { id: true },
      });
    if (!isAdmin) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const createInput = await DiscussionBoardArticleImageCollector.collect({
    body: props.body,
    discussionBoardArticles: article,
  });
  const now = new Date();
  const timestamp = toISOStringSafe(now);
  const data = {
    ...createInput,
    created_at: timestamp as string & tags.Format<"date-time">,
    updated_at: timestamp as string & tags.Format<"date-time">,
    deleted_at: null,
    article: { connect: { id: props.articleId } },
  };
  const created = await MyGlobal.prisma.discussion_board_article_images.create({
    data,
  });
  return {
    id: created.id,
    discussion_board_article_id: created.discussion_board_article_id,
    image_url: created.image_url,
    description: created.description,
    display_order: created.display_order,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at,
  };
}
