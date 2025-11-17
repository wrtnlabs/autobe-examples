import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerQuestion";
import { IPageIShoppingMallCustomerQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerQuestion";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallCustomerQuestions(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomerQuestion.IRequest;
}): Promise<IPageIShoppingMallCustomerQuestion.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null as null,
    ...(props.body.searchTitle
      ? { title: { contains: props.body.searchTitle } }
      : {}),
    ...(props.body.searchBody
      ? { body: { contains: props.body.searchBody } }
      : {}),
    ...(props.body.shoppingMallCustomerSessionId
      ? {
          shopping_mall_customer_session_id:
            props.body.shoppingMallCustomerSessionId,
        }
      : {}),
    ...(props.body.createdAfter || props.body.createdBefore
      ? {
          created_at: {
            ...(props.body.createdAfter
              ? { gte: props.body.createdAfter }
              : {}),
            ...(props.body.createdBefore
              ? { lte: props.body.createdBefore }
              : {}),
          },
        }
      : {}),
  };

  const orderByClause =
    props.body.sortBy && props.body.sortOrder
      ? { [props.body.sortBy]: props.body.sortOrder }
      : { created_at: "desc" as const };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customer_questions.findMany({
      where,
      skip,
      take: limit,
      orderBy: orderByClause,
    }),

    MyGlobal.prisma.shopping_mall_customer_questions.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      title: item.title,
      created_at: toISOStringSafe(item.created_at),
      shopping_mall_customer_id: item.shopping_mall_customer_id,
    })),
  };
}
