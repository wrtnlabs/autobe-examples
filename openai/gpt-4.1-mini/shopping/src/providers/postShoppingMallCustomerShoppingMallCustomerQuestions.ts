import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerQuestion";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingMallCustomerQuestions(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerQuestion.ICreate;
}): Promise<IShoppingMallCustomerQuestion> {
  const created = await MyGlobal.prisma.shopping_mall_customer_questions.create(
    {
      data: {
        id: v4(),
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_customer_session_id: props.customer.session_id,
        title: props.body.title,
        body: props.body.body,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      created.shopping_mall_customer_session_id,
    title: created.title,
    body: created.body,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
