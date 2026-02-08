import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserArticlesArticleIdImages(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.IUpdateImagesRequest;
}): Promise<IDiscussionBoardArticleImage> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) throw new HttpException("Article not found", 404);
  if (article.registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existingImages =
    await MyGlobal.prisma.discussion_board_article_images.findMany({
      where: { discussion_board_article_id: props.articleId, deleted_at: null },
    });
  const now = toISOStringSafe(new Date());
  // We expect props.body to be an object with properties:
  // create: IDiscussionBoardArticleImage[] for new images with no ID
  // update: Array<{ id: string; description?: string | null; display_order?: number }>
  // The exact structure is not provided so assuming typical pattern
  // Define helper for checking if display_order is valid number
  function isValidDisplayOrder(value: unknown): value is number {
    return typeof value === "number" && !isNaN(value);
  }
  // Extract create and update arrays from props.body safely
  const createImages = (props.body as any).create ?? [];
  const updateImages = (props.body as any).update ?? [];
  const requestImageIds = new Set<string>();
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    // Process update images
    for (const updateImage of updateImages) {
      if (typeof updateImage.id !== "string" || updateImage.id.length === 0) {
        throw new HttpException("Invalid image update id", 400);
      }
      requestImageIds.add(updateImage.id);
      const existingImage = existingImages.find((e) => e.id === updateImage.id);
      if (!existingImage) {
        throw new HttpException("Image not found", 404);
      }
      await prisma.discussion_board_article_images.update({
        where: { id: updateImage.id },
        data: {
          description:
            updateImage.description !== undefined
              ? updateImage.description
              : existingImage.description,
          display_order: isValidDisplayOrder(updateImage.display_order)
            ? updateImage.display_order
            : (existingImage.display_order ?? 0),
          updated_at: now,
        },
      });
    }
    // Process create images
    for (const newImage of createImages) {
      const displayOrder = isValidDisplayOrder(newImage.display_order)
        ? newImage.display_order
        : 0;
      await prisma.discussion_board_article_images.create({
        data: {
          id: v4(),
          discussion_board_article_id: props.articleId,
          image_url: newImage.image_url ?? "",
          description:
            typeof newImage.description === "string"
              ? newImage.description
              : null,
          display_order: displayOrder,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
    // Soft delete omitted images
    for (const oldImage of existingImages) {
      if (!requestImageIds.has(oldImage.id)) {
        await prisma.discussion_board_article_images.update({
          where: { id: oldImage.id },
          data: {
            deleted_at: now,
            updated_at: now,
          },
        });
      }
    }
    // Return updated images list
    const updatedImages = await prisma.discussion_board_article_images.findMany(
      {
        where: {
          discussion_board_article_id: props.articleId,
          deleted_at: null,
        },
        orderBy: { display_order: "asc" },
      },
    );
    // Map timestamps and nullable description
    return {
      images: updatedImages.map((img) => ({
        id: img.id,
        discussion_board_article_id: img.discussion_board_article_id,
        image_url: img.image_url,
        description: img.description ?? undefined,
        display_order: img.display_order,
        created_at: toISOStringSafe(img.created_at),
        updated_at: toISOStringSafe(img.updated_at),
        deleted_at: img.deleted_at ? toISOStringSafe(img.deleted_at) : null,
      })),
    };
  });
}
