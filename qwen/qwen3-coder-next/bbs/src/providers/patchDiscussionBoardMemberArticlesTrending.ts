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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberArticlesTrending(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = 0;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nowIso = toISOStringSafe(now);
  const sevenDaysAgoIso = toISOStringSafe(sevenDaysAgo);
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: {
      deleted_at: null,
      view_count: { gte: 100 },
      created_at: {
        gte: sevenDaysAgoIso,
      },
    },
    orderBy: { view_count: "desc" },
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      deleted_at: null,
      view_count: { gte: 100 },
      created_at: {
        gte: sevenDaysAgoIso,
      },
    },
  });
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    data: data.map((article) => ({
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      content: article.content,
      view_count: article.view_count,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
  };
}
