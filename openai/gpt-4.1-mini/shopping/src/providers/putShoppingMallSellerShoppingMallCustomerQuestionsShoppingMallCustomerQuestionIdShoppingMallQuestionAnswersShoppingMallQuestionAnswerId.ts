import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallQuestionAnswer";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerShoppingMallCustomerQuestionsShoppingMallCustomerQuestionIdShoppingMallQuestionAnswersShoppingMallQuestionAnswerId(props: {
  seller: SellerPayload;
  shoppingMallCustomerQuestionId: string & tags.Format<"uuid">;
  shoppingMallQuestionAnswerId: string & tags.Format<"uuid">;
  body: IShoppingMallQuestionAnswer.IUpdate;
}): Promise<IShoppingMallQuestionAnswer> {
  const existing =
    await MyGlobal.prisma.shopping_mall_question_answers.findUnique({
      where: { id: props.shoppingMallQuestionAnswerId },
    });

  if (
    !existing ||
    existing.shopping_mall_customer_question_id !==
      props.shoppingMallCustomerQuestionId
  ) {
    throw new HttpException("Shopping mall question answer not found", 404);
  }

  if (existing.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.shopping_mall_question_answers.update({
    where: { id: props.shoppingMallQuestionAnswerId },
    data: {
      title: props.body.title,
      body: props.body.body,
      created_at: props.body.created_at ?? existing.created_at,
      updated_at: toISOStringSafe(new Date()),
      deleted_at:
        props.body.deleted_at === undefined
          ? existing.deleted_at
          : props.body.deleted_at,
    },
  });

  return {
    id: updated.id,
    shopping_mall_customer_question_id:
      updated.shopping_mall_customer_question_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    shopping_mall_seller_session_id: updated.shopping_mall_seller_session_id,
    title: updated.title,
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
