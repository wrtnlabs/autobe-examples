import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorArticlesArticleIdImages(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.IRequest;
}): Promise<IPageIDiscussionBoardArticleImage.ISummary> {
  // Request body is already validated by JSON Schema, runtime validation removed
  // Check article existence and authorization
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true, registered_user_id: true, deleted_at: true },
  });
  if (!article || article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  if (article.registered_user_id !== props.administrator.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  // Fetch existing images linked to the article
  const existingImages =
    await MyGlobal.prisma.discussion_board_article_images.findMany({
      where: { article: { id: props.articleId }, deleted_at: null },
      select: {
        id: true,
        description: true,
        display_order: true,
        image_url: true,
        created_at: true,
        updated_at: true,
      },
    });
  const existingImagesMap = new Map(existingImages.map((img) => [img.id, img]));
  // Cast props.body to array of images
  const bodyArray = props.body as Array<{
    id?: string & tags.Format<"uuid">;
    image_url: string;
    description?: string | null;
    order?: number | null;
  }>;
  // Identify images to update, create, and delete
  const updateImages = bodyArray.filter(
    (
      img,
    ): img is {
      id: string & tags.Format<"uuid">;
      image_url: string;
      description?: string | null;
      order?: number | null;
    } => typeof img.id === "string" && existingImagesMap.has(img.id),
  );
  const createImages = bodyArray.filter((img) => !img.id);
  const deleteImages = existingImages.filter(
    (img) => !bodyArray.some((b) => b.id === img.id),
  );
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Batch update images
    await Promise.all(
      updateImages.map((img) => {
        const displayOrder =
          img.order !== null && img.order !== undefined ? img.order : undefined;
        return prisma.discussion_board_article_images.update({
          where: { id: img.id },
          data: {
            description: img.description ?? null,
            display_order: displayOrder,
            updated_at: now,
          },
        });
      }),
    );
    // Batch create new images
    await Promise.all(
      createImages.map((img) => {
        const displayOrder =
          img.order !== null && img.order !== undefined ? img.order : 0;
        return prisma.discussion_board_article_images.create({
          data: {
            id: v4(),
            article: { connect: { id: props.articleId } },
            image_url: img.image_url,
            description: img.description ?? null,
            created_at: now,
            updated_at: now,
            deleted_at: null,
            display_order: displayOrder,
          },
        });
      }),
    );
    // Soft delete omitted images
    await Promise.all(
      deleteImages.map((img) =>
        prisma.discussion_board_article_images.update({
          where: { id: img.id },
          data: { deleted_at: now },
        }),
      ),
    );
  });
  // Fetch updated images for response
  const updatedImages =
    await MyGlobal.prisma.discussion_board_article_images.findMany({
      where: { article: { id: props.articleId }, deleted_at: null },
      orderBy: { display_order: "asc" },
      select: {
        id: true,
        image_url: true,
        description: true,
        display_order: true,
        created_at: true,
        updated_at: true,
      },
    });
  return {
    data: updatedImages.map((img) => ({
      id: img.id,
      image_url: img.image_url,
      description: img.description ?? null,
      order: img.display_order ?? null,
      created_at: toISOStringSafe(img.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(img.updated_at) as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: 1,
      limit: updatedImages.length,
      records: updatedImages.length,
      pages: 1,
    },
  };
}
