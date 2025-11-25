import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallQuestionAnswer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShoppingMallCustomerQuestionsShoppingMallCustomerQuestionIdShoppingMallQuestionAnswersShoppingMallQuestionAnswerId(props: {
  customer: CustomerPayload;
  shoppingMallCustomerQuestionId: string & import("typia").tags.Format<"uuid">;

  shoppingMallQuestionAnswerId: string & import("typia").tags.Format<"uuid">;
}): Promise<IShoppingMallQuestionAnswer> {
  const answer = await MyGlobal.prisma.shopping_mall_question_answers.findFirst(
    {
      where: {
        id: props.shoppingMallQuestionAnswerId,
        shopping_mall_customer_question_id:
          props.shoppingMallCustomerQuestionId,
      },
    },
  );

  if (!answer) {
    throw new HttpException("Seller answer not found.", 404);
  }

  return {
    id: answer.id,
    shopping_mall_customer_question_id:
      answer.shopping_mall_customer_question_id,
    shopping_mall_seller_id: answer.shopping_mall_seller_id,
    shopping_mall_seller_session_id: answer.shopping_mall_seller_session_id,
    title: answer.title,
    body: answer.body,
    created_at: toISOStringSafe(answer.created_at),
    updated_at: toISOStringSafe(answer.updated_at),
    deleted_at: answer.deleted_at ? toISOStringSafe(answer.deleted_at) : null,
  };
}
