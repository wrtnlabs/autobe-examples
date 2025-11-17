import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingMallCustomerQuestionsShoppingMallCustomerQuestionId(props: {
  customer: CustomerPayload;
  shoppingMallCustomerQuestionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const question =
    await MyGlobal.prisma.shopping_mall_customer_questions.findUnique({
      where: { id: props.shoppingMallCustomerQuestionId },
    });

  if (!question) {
    throw new HttpException("Customer question not found", 404);
  }

  if (question.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.shopping_mall_customer_questions.delete({
    where: { id: props.shoppingMallCustomerQuestionId },
  });
}
