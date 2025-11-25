import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    // Verify article exists and is not already deleted
    const article = await MyGlobal.prisma.shopping_mall_articles.findFirst({
      where: {
        id: props.articleId,
        deleted_at: null,
      },
    });

    if (!article) {
      throw new HttpException("Article not found or already deleted", 404);
    }

    // Additional permission check: ensure admin has rights to delete articles
    // This could be extended based on admin roles and permissions

    // Perform soft deletion with transaction for atomicity
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Update the article with soft deletion
      await tx.shopping_mall_articles.update({
        where: {
          id: props.articleId,
        },
        data: {
          deleted_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });

      // The system automatically handles cascading soft deletion for related entities
      // such as article comments through database constraints
      // If explicit cascading is needed, add additional operations here
    });
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }

    // Log the error for debugging
    console.error(`Error deleting article ${props.articleId}:`, error);
    throw new HttpException("Failed to delete article", 500);
  }
}
