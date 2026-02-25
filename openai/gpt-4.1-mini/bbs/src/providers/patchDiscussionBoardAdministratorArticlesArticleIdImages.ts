import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardArticleImageRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImageRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardArticleImageAtListTransformer } from "../transformers/DiscussionBoardArticleImageAtListTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorArticlesArticleIdImages(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.IRequest;
}): Promise<IDiscussionBoardArticleImage.IList> {
  const { administrator, articleId, body } = props;
  // Verify article existence
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
    select: { id: true, registered_user_id: true },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Authorization check: allow only administrators
  // The administrator payload is assumed already verified
  // Extra safety check
  const admin =
    await MyGlobal.prisma.discussion_board_administrators.findUnique({
      where: { id: administrator.id },
      select: { id: true, deleted_at: true },
    });
  if (!admin || admin.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate unique displayOrder
  const displayOrders = body.data.map((item) => {
    if (typeof (item as any).displayOrder !== "number")
      throw new HttpException("displayOrder must be a number", 400);
    return (item as any).displayOrder;
  });
  const uniqueDisplayOrders = new Set(displayOrders);
  if (uniqueDisplayOrders.size !== displayOrders.length) {
    throw new HttpException(
      "Duplicate displayOrder values are not allowed",
      400,
    );
  }
  // Validate non-empty imageUrl strings
  for (const item of body.data) {
    if (
      typeof (item as any).imageUrl !== "string" ||
      (item as any).imageUrl.trim() === ""
    ) {
      throw new HttpException("Invalid imageUrl in request data", 400);
    }
  }
  // Utility for safe date string
  function getNow(): string & tags.Format<"date-time"> {
    return toISOStringSafe(new Date());
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete all existing images for the article
    await tx.discussion_board_article_images.deleteMany({
      where: { discussion_board_article_id: articleId },
    });
    // Insert new images
    for (const item of body.data) {
      const displayOrder = (item as any).displayOrder;
      const imageUrl = (item as any).imageUrl;
      const description = (item as any).description ?? null;
      await tx.discussion_board_article_images.create({
        data: {
          id: v4(),
          discussion_board_article_id: articleId,
          image_url: imageUrl,
          description: description,
          display_order: displayOrder,
          created_at: getNow(),
          updated_at: getNow(),
          deleted_at: null,
        },
      });
    }
    // Fetch updated images with transformer select
    const updatedImages = await tx.discussion_board_article_images.findMany({
      where: { discussion_board_article_id: articleId },
      orderBy: { display_order: "asc" },
      ...DiscussionBoardArticleImageAtListTransformer.select(),
    });
    // Transform to response DTO
    return await DiscussionBoardArticleImageAtListTransformer.transform(
      updatedImages,
    );
  });
}
