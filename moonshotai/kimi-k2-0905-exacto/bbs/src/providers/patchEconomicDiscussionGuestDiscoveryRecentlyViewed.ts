import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionRecentlyViewed } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecentlyViewed";
import { IEconomicDiscussionSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSortOrder";
import { IPageIEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function patchEconomicDiscussionGuestDiscoveryRecentlyViewed(props: {
  guest: GuestPayload;
  body: IEconomicDiscussionRecentlyViewed.IRequest;
}): Promise<IPageIEconomicDiscussionArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortOrder = props.body.sort_order === "asc" ? "asc" : "desc";

  const baseArticleQuery = {
    where: {
      status: "approved",
      ...(props.body.include_deleted ? {} : { deleted_at: null }),
    },
    skip,
    take: limit,
    orderBy: {
      updated_at: sortOrder,
    },
  } as const;

  const articles =
    await MyGlobal.prisma.economic_discussion_articles.findMany(
      baseArticleQuery,
    );
  const total = await MyGlobal.prisma.economic_discussion_articles.count({
    where: baseArticleQuery.where,
  });

  return {
    data: articles.map((article) => ({
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      view_count: article.view_count,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      economic_discussion_member_id:
        article.economic_discussion_member_id as string & tags.Format<"uuid">,
      economic_discussion_moderator_id:
        article.economic_discussion_moderator_id as string &
          tags.Format<"uuid">,
      member_author: undefined as
        | IEconomicDiscussionMembers.ISummary
        | undefined,
      moderator_author: undefined as
        | IEconomicDiscussionModerators.ISummary
        | undefined,
      categories: [] as IEconomicDiscussionCategories.ISummary[],
      attachments_count: 0,
      comments_count: 0,
      status: article.status as "pending" | "approved" | "rejected",
    })),
    pagination: {
      current: page.toString() as ICrIPageIntegerRequired,
      limit: limit.toString() as ICrIPageIntegerRequired,
      records: total.toString() as ICrIPageIntegerRequired,
      pages: Math.ceil(total / limit).toString() as ICrIPageIntegerRequired,
    },
  };
}
