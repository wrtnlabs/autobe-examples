import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestion";
import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerSaleQuestions(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleQuestion.IRequest;
}): Promise<IPageIShoppingMallSaleQuestion.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = 0;
  const where: Prisma.shopping_mall_sale_questionsWhereInput = {
    deleted_at: null,
    shopping_mall_customer_id: props.customer.id,
  };
  const orderBy: Prisma.shopping_mall_sale_questionsOrderByWithRelationInput = {
    created_at: "desc",
  };
  const data = await MyGlobal.prisma.shopping_mall_sale_questions.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      shopping_mall_customer_id: true,
      shopping_mall_sale_id: true,
      title: true,
      body: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_sale_questions.count({
    where,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      customer_id: record.shopping_mall_customer_id,
      sale_id: record.shopping_mall_sale_id,
      title: record.title,
      body: record.body,
      status: record.status,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at
        ? toISOStringSafe(record.deleted_at)
        : undefined,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
