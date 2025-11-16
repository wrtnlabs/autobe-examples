import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleComment";
import { IPageIShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticleComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUser";

export async function patchShoppingMallShoppingMallArticleCategoriesShoppingMallArticleCategoryIdComments(props: {
  shoppingMallArticleCategoryId: string & tags.Format<"uuid">;
  body: IShoppingMallArticleComment.IRequest;
}): Promise<IPageIShoppingMallArticleComment.ISummary> {
  const page =
    props.body.page > 0
      ? (props.body.page satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<0>)
      : (1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>);
  const limit =
    props.body.limit > 0
      ? (props.body.limit satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<0>)
      : (10 satisfies number & tags.Type<"int32"> & tags.Minimum<0>);
  const skip = (page - 1) * limit;

  const andCondition: any[] = [];

  if (props.body.search) {
    andCondition.push({
      body: { contains: props.body.search, mode: "insensitive" },
    });
  }

  if (props.body.authorId) {
    andCondition.push({ author_id: props.body.authorId });
  }

  if (props.body.dateFrom || props.body.dateTo) {
    const dateFilter: Record<string, string & tags.Format<"date-time">> = {};
    if (props.body.dateFrom) dateFilter.gte = props.body.dateFrom;
    if (props.body.dateTo) dateFilter.lte = props.body.dateTo;
    andCondition.push({ created_at: dateFilter });
  }

  const where = {
    article: {
      is: {
        id: props.shoppingMallArticleCategoryId as string & tags.Format<"uuid">,
      },
    },
    ...(andCondition.length > 0 ? { AND: andCondition } : {}),
  } satisfies Prisma.shopping_mall_article_commentsWhereInput as Prisma.shopping_mall_article_commentsWhereInput;

  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_article_comments.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    MyGlobal.prisma.shopping_mall_article_comments.count({ where }),
  ]);

  const data: IShoppingMallArticleComment.ISummary[] = comments.map(
    (comment) => ({
      id: comment.id as string & tags.Format<"uuid">,
      content: comment.body,
      created_at: toISOStringSafe(comment.created_at),
      author: {
        id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        username: "unknown",
        email: "unknown@example.com",
        status: "unknown",
        created_at: toISOStringSafe(new Date()),
        last_login_at: undefined,
        role: undefined,
      },
      article_id: comment.shopping_mall_article_id,
    }),
  );

  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit) satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };

  return {
    data,
    pagination,
  } satisfies IPageIShoppingMallArticleComment.ISummary;
}
