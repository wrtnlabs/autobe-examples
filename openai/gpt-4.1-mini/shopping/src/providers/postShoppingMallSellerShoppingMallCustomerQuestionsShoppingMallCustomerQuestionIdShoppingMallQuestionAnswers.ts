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

export async function postShoppingMallSellerShoppingMallCustomerQuestionsShoppingMallCustomerQuestionIdShoppingMallQuestionAnswers(props: {
  seller: SellerPayload;
  shoppingMallCustomerQuestionId: string & tags.Format<"uuid">;
  body: IShoppingMallQuestionAnswer.ICreate;
}): Promise<IShoppingMallQuestionAnswer> {
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_question_answers.create({
    data: {
      id: v4(),
      shopping_mall_customer_question_id: props.shoppingMallCustomerQuestionId,
      shopping_mall_seller_id: props.seller.id,
      shopping_mall_seller_session_id: props.seller.session_id,
      title: props.body.title,
      body: props.body.body,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_customer_question_id:
      created.shopping_mall_customer_question_id,
    shopping_mall_seller_id: created.shopping_mall_seller_id,
    shopping_mall_seller_session_id: created.shopping_mall_seller_session_id,
    title: created.title,
    body: created.body,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
