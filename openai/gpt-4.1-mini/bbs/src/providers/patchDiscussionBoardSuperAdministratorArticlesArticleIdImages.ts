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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardArticleImageTransformer } from "../transformers/DiscussionBoardArticleImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdministratorArticlesArticleIdImages(props: {
  superAdministrator: SuperadministratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.IRequest;
}): Promise<IDiscussionBoardArticleImage[]> {
  const { articleId, body } = props;
  type ItemType = {
    imageUrl: string;
    description?: string | null | undefined;
    displayOrder: number;
  };
  if (!Array.isArray(body.data)) {
    throw new HttpException("Invalid data array.", 400);
  }
  const displayOrders = new Set<number>();
  for (const item of body.data as ItemType[]) {
    if (!Number.isInteger(item.displayOrder)) {
      throw new HttpException("displayOrder must be an integer.", 400);
    }
    if (displayOrders.has(item.displayOrder)) {
      throw new HttpException("displayOrder values must be unique.", 400);
    }
    displayOrders.add(item.displayOrder);
    if (typeof item.imageUrl !== "string") {
      throw new HttpException("imageUrl must be a string.", 400);
    }
  }
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
    select: { id: true, deleted_at: true },
  });
  if (!article || article.deleted_at !== null) {
    throw new HttpException("Article not found.", 404);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.discussion_board_article_images.deleteMany({
      where: { discussion_board_article_id: articleId },
    });
    await prisma.discussion_board_article_images.createMany({
      data: (body.data as ItemType[]).map((item) => ({
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_article_id: articleId,
        image_url: item.imageUrl,
        description: item.description ?? null,
        display_order: item.displayOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      })),
      skipDuplicates: true,
    });
  });
  const updatedImages =
    await MyGlobal.prisma.discussion_board_article_images.findMany({
      where: { discussion_board_article_id: articleId, deleted_at: null },
      orderBy: { display_order: "asc" },
      select: {
        id: true,
        discussion_board_article_id: true,
        image_url: true,
        description: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            registered_user_id: true,
            section_id: true,
            title: true,
            content: true,
          },
        },
      },
    });
  return await ArrayUtil.asyncMap(
    updatedImages,
    DiscussionBoardArticleImageTransformer.transform,
  );
}
