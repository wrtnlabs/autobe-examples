import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteDiscussionBoardAdminUserArticlesArticleId(props: {
  adminUser: AdminuserPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    // Use deleteMany so we can reliably inspect affected row count
    const result = await MyGlobal.prisma.discussion_board_articles.deleteMany({
      where: {
        id: props.articleId,
      },
    });

    if (result.count === 0) {
      throw new HttpException("Article not found", 404);
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        throw new HttpException(
          "Unable to delete article due to related entities constraints",
          400,
        );
      }

      if (error.code === "P2025") {
        throw new HttpException("Article not found", 404);
      }
    }

    throw error;
  }
}
