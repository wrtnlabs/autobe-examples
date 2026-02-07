import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardComment";
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

export async function patchEconomicBoardAdministratorReportsCommentsUserId(props: {
  administrator: AdministratorPayload;
  userId: string;
  body: {
    page?: number;
    limit?: number;
  };
}): Promise<IPageIEconomicBoardComment.ISummary> {
  // Validate page and limit parameters
  const page = props.body?.page ?? 1;
  const limit = props.body?.limit ?? 30;
  if (page < 1 || limit < 1) {
    throw new HttpException("Page and limit must be positive integers", 400);
  }
  const skip = (page - 1) * limit;
  // Verify user exists and is not deleted
  const userExists = await MyGlobal.prisma.economic_board_citizens.findUnique({
    where: { id: props.userId, deleted_at: null },
  });
  if (!userExists) throw new HttpException("User not found", 404);
  // Define common where conditions - use undefined instead of null for 'not' field
  const whereInput = {
    economic_board_users_id: props.userId,
    deleted_at: null,
    economic_board_articles_id: { not: undefined },
  } satisfies Prisma.economic_board_commentsWhereInput;
  // Fetch comments with necessary fields - remove relation selects to avoid type conflicts
  const comments = await MyGlobal.prisma.economic_board_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      content: true,
      created_at: true,
      economic_board_articles_id: true,
      economic_board_users_id: true,
    },
  });
  // Count total matching comments
  const total = await MyGlobal.prisma.economic_board_comments.count({
    where: whereInput,
  });
  // Transform to response format - use separate queries for article titles and author display names
  const data = await Promise.all(
    comments.map(async (comment) => {
      // Get article title
      const article = comment.economic_board_articles_id
        ? await MyGlobal.prisma.economic_board_articles.findUnique({
            where: { id: comment.economic_board_articles_id },
            select: { title: true },
          })
        : null;
      // Get author display name
      const author = await MyGlobal.prisma.economic_board_citizens.findUnique({
        where: { id: comment.economic_board_users_id },
        select: { display_name: true },
      });
      return {
        id: comment.id,
        content: comment.content,
        created_at: toISOStringSafe(comment.created_at),
        article: {
          id: comment.economic_board_articles_id || "",
          title: article?.title || "",
        },
        author: {
          display_name: author?.display_name || "",
        },
      };
    }),
  );
  // Construct pagination object
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
