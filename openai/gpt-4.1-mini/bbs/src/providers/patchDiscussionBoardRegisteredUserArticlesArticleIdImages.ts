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
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardArticleImageTransformer } from "../transformers/DiscussionBoardArticleImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserArticlesArticleIdImages(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.IRequest;
}): Promise<IDiscussionBoardArticleImage[]> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true, registered_user_id: true, deleted_at: true },
  });
  if (!article || article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  if (article.registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Explicitly assert the type of each image item
  const imagesData = props.body.data as ((typeof props.body.data)[number] & {
    id?: string | null;
    imageUrl: string;
    description?: string | null;
    displayOrder: number;
  })[];
  const displayOrders = imagesData.map((image) => image.displayOrder);
  const uniqueDisplayOrders = new Set(displayOrders);
  if (displayOrders.length !== uniqueDisplayOrders.size) {
    throw new HttpException("Duplicate displayOrder values found", 400);
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_article_images.deleteMany({
      where: {
        discussion_board_article_id: props.articleId,
        NOT: { display_order: { in: displayOrders } },
      },
    });
    for (const image of imagesData) {
      await tx.discussion_board_article_images.upsert({
        where: {
          id: image.id ?? "",
        },
        update: {
          image_url: image.imageUrl,
          description: image.description ?? null,
          display_order: image.displayOrder,
          updated_at: now,
          deleted_at: null,
        },
        create: {
          id: v4(),
          discussion_board_article_id: props.articleId,
          image_url: image.imageUrl,
          description: image.description ?? null,
          display_order: image.displayOrder,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
  });
  const images = await MyGlobal.prisma.discussion_board_article_images.findMany(
    {
      where: { discussion_board_article_id: props.articleId, deleted_at: null },
      orderBy: { display_order: "asc" },
      ...DiscussionBoardArticleImageTransformer.select(),
    },
  );
  return await Promise.all(
    images.map(DiscussionBoardArticleImageTransformer.transform),
  );
}
