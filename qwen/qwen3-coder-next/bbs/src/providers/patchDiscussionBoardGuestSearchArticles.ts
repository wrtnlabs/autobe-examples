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
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: {
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      title: true,
      view_count: true,
      created_at: true,
      author_id: true,
      section_id: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      deleted_at: null,
    },
  });
  return {
    data: data.map((article) => ({
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      view_count: article.view_count,
      created_at: toISOStringSafe(article.created_at),
      author: {
        id: article.author_id as string & tags.Format<"uuid">,
        name: "",
      },
      section: {
        id: article.section_id as string & tags.Format<"uuid">,
        name: "",
      },
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
