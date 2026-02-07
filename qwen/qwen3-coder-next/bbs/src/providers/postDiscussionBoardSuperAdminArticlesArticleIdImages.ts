import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardSuperAdminArticlesArticleIdImages(props: {
  superAdmin: SuperadminPayload;
  articleId: string;
  body: IDiscussionBoardArticleImage.ICreate;
}): Promise<IDiscussionBoardArticleImage> {
  // Verify article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Create image record with metadata
  const created = await MyGlobal.prisma.discussion_board_article_images.create({
    data: {
      id: v4(),
      discussion_board_article_id: props.articleId,
      original_filename: (props.body as any).original_filename ?? "",
      stored_filename: (props.body as any).stored_filename ?? "",
      mime_type: (props.body as any).mime_type ?? "",
      size: (props.body as any).size ?? 0,
      width: (props.body as any).width ?? 0,
      height: (props.body as any).height ?? 0,
      display_order: (props.body as any).display_order ?? 0,
    },
  });
  // Return created image
  return {
    id: created.id,
    discussion_board_article_id: created.discussion_board_article_id,
    original_filename: created.original_filename,
    stored_filename: created.stored_filename,
    mime_type: created.mime_type,
    size: created.size,
    width: created.width,
    height: created.height,
    display_order: created.display_order,
  };
}
