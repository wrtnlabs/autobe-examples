import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getShoppingMallCustomerSaleQuestionsQuestionId(props: {
  customer: CustomerPayload;
  questionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleQuestion> {
  const record = await MyGlobal.prisma.shopping_mall_sale_questions.findFirst({
    where: {
      id: props.questionId,
      deleted_at: null,
      shopping_mall_customer_id: props.customer.id,
    },
    select: {
      id: true,
      shopping_mall_sale_id: true,
      shopping_mall_customer_id: true,
      title: true,
      body: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (record === null) {
    throw new HttpException("Sale question not found", 404);
  }
  return {
    id: record.id,
    sale_id: record.shopping_mall_sale_id,
    customer_id: record.shopping_mall_customer_id,
    title: record.title,
    body: record.body,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
