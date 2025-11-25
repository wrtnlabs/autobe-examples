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

export async function putShoppingMallCustomerShoppingMallCustomerQuestionsShoppingMallCustomerQuestionId(props: {
  customer: CustomerPayload;
  shoppingMallCustomerQuestionId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerQuestion.IUpdate;
}): Promise<IShoppingMallCustomerQuestion> {
  const existing =
    await MyGlobal.prisma.shopping_mall_customer_questions.findUnique({
      where: { id: props.shoppingMallCustomerQuestionId },
    });

  if (!existing) {
    throw new HttpException("Customer question not found", 404);
  }

  if (existing.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.shopping_mall_customer_questions.update(
    {
      where: { id: props.shoppingMallCustomerQuestionId },
      data: {
        title: props.body.title,
        body: props.body.body,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      updated.shopping_mall_customer_session_id,
    title: updated.title,
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
