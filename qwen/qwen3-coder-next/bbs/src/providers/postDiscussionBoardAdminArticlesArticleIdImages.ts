import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminArticlesArticleIdImages(props: {
  admin: AdminPayload;
  articleId: string;
  body: IDiscussionBoardArticleImage.ICreate;
}): Promise<IDiscussionBoardArticleImage> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  const image = await MyGlobal.prisma.discussion_board_article_images.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      original_filename: "",
      stored_filename: "",
      mime_type: "",
      size: 0,
      width: 0,
      height: 0,
      display_order: 0,
      article: { connect: { id: props.articleId } },
    },
    select: {
      id: true,
      original_filename: true,
      stored_filename: true,
      mime_type: true,
      size: true,
      width: true,
      height: true,
      display_order: true,
    },
  });
  return {
    id: image.id as string & tags.Format<"uuid">,
    original_filename: image.original_filename,
    stored_filename: image.stored_filename,
    mime_type: image.mime_type,
    size: image.size,
    width: image.width,
    height: image.height,
    display_order: image.display_order,
  };
}
