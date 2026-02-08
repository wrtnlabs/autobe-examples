import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardGuestSearchArticles(props: {
  guest: GuestPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const {
    page = 1,
    limit = 20,
    sortBy = "created_at",
    sortOrder = "desc",
  } = props.body as {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
  const skip = (page - 1) * limit;
  try {
    const orderBy: Record<string, "asc" | "desc"> = {};
    orderBy[sortBy] = sortOrder;
    const [articles, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_articles.findMany({
        skip,
        take: limit,
        orderBy,
        where: { deleted_at: null },
        select: {
          id: true,
          title: true,
          content: true,
          created_at: true,
          updated_at: true,
        },
      }),
      MyGlobal.prisma.discussion_board_articles.count({
        where: { deleted_at: null },
      }),
    ]);
    const data: IPageIDiscussionBoardArticle.ISummary["data"] = articles.map(
      (article) => ({
        // ISummary is empty object per the structure
        // We do not return date fields here since ISummary data type is empty object
      }),
    );
    return {
      data,
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw new HttpException("Failed to search articles", 500);
  }
}
