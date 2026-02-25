import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleQuestionAnswerTransformer } from "../transformers/ShoppingMallSaleQuestionAnswerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerSalesSaleIdQuestionAnswersAnswerId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  answerId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleQuestionAnswer.IUpdate;
}): Promise<IShoppingMallSaleQuestionAnswer> {
  const answer =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.findUnique({
      where: { id: props.answerId },
      select: {
        id: true,
        shopping_mall_sale_question_id: true,
        seller_id: true,
        title: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        saleQuestion: { select: { id: true, shopping_mall_sale_id: true } },
      },
    });
  if (answer === null) {
    throw new HttpException("Answer not found", 404);
  }
  if (answer.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (answer.saleQuestion.shopping_mall_sale_id !== props.saleId) {
    throw new HttpException("Answer does not belong to sale", 400);
  }
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  await MyGlobal.prisma.shopping_mall_sale_question_answers.update({
    where: { id: props.answerId },
    data: {
      title: props.body.title,
      body: props.body.body,
      updated_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.findUniqueOrThrow(
      {
        where: { id: props.answerId },
        ...ShoppingMallSaleQuestionAnswerTransformer.select(),
      },
    );
  return ShoppingMallSaleQuestionAnswerTransformer.transform(updated);
}
