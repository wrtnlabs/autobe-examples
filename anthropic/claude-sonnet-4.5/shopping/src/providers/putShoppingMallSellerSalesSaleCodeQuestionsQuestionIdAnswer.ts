import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerSalesSaleCodeQuestionsQuestionIdAnswer(props: {
  seller: SellerPayload;
  saleCode: string;
  questionId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleQuestionAnswer.IUpdate;
}): Promise<IShoppingMallSaleQuestionAnswer> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  const question = await MyGlobal.prisma.shopping_mall_sale_questions.findFirst(
    {
      where: {
        id: props.questionId,
        shopping_mall_sale_id: sale.id,
        deleted_at: null,
      },
    },
  );

  if (!question) {
    throw new HttpException("Question not found", 404);
  }

  const existingAnswer =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.findFirst({
      where: {
        shopping_mall_sale_question_id: props.questionId,
        deleted_at: null,
      },
    });

  if (!existingAnswer) {
    throw new HttpException("Answer not found", 404);
  }

  if (existingAnswer.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.update({
      where: {
        id: existingAnswer.id,
      },
      data: {
        ...(props.body.title !== undefined && { title: props.body.title }),
        ...(props.body.body !== undefined && { body: props.body.body }),
        updated_at: new Date(),
      },
    });

  return {
    id: updated.id,
    title: updated.title,
    body: updated.body,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    shopping_mall_seller_session_id: updated.shopping_mall_seller_session_id,
    shopping_mall_sale_question_id: updated.shopping_mall_sale_question_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
