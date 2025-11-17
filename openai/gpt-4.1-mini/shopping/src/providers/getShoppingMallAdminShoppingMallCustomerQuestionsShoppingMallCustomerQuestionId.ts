import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerQuestion";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminShoppingMallCustomerQuestionsShoppingMallCustomerQuestionId(props: {
  admin: AdminPayload;
  shoppingMallCustomerQuestionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerQuestion> {
  const question =
    await MyGlobal.prisma.shopping_mall_customer_questions.findUnique({
      where: { id: props.shoppingMallCustomerQuestionId },
    });

  if (!question) {
    throw new HttpException("Shopping mall customer question not found", 404);
  }

  return {
    id: question.id,
    shopping_mall_customer_id: question.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      question.shopping_mall_customer_session_id,
    title: question.title,
    body: question.body,
    created_at: toISOStringSafe(question.created_at),
    updated_at: toISOStringSafe(question.updated_at),
    deleted_at: question.deleted_at
      ? toISOStringSafe(question.deleted_at)
      : null,
  };
}
