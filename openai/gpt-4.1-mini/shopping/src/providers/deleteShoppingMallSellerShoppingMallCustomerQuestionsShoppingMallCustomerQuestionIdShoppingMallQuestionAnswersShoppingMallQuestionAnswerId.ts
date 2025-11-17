import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerShoppingMallCustomerQuestionsShoppingMallCustomerQuestionIdShoppingMallQuestionAnswersShoppingMallQuestionAnswerId(props: {
  seller: SellerPayload;
  shoppingMallCustomerQuestionId: string & tags.Format<"uuid">;
  shoppingMallQuestionAnswerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.shopping_mall_question_answers.findFirst({
      where: {
        id: props.shoppingMallQuestionAnswerId,
        shopping_mall_customer_question_id:
          props.shoppingMallCustomerQuestionId,
        deleted_at: null,
      },
      select: {
        shopping_mall_seller_id: true,
      },
    });

  if (!existing) {
    throw new HttpException("Question answer not found", 404);
  }

  if (existing.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: you are not the owner", 403);
  }

  await MyGlobal.prisma.shopping_mall_question_answers.delete({
    where: {
      id: props.shoppingMallQuestionAnswerId,
    },
  });
}
