import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";

export async function getShoppingMallSalesSaleCodeQuestionsQuestionIdAnswer(props: {
  saleCode: string;
  questionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleQuestionAnswer> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { code: props.saleCode },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  const question =
    await MyGlobal.prisma.shopping_mall_sale_questions.findUnique({
      where: { id: props.questionId },
    });

  if (!question) {
    throw new HttpException("Question not found", 404);
  }

  if (question.shopping_mall_sale_id !== sale.id) {
    throw new HttpException(
      "Question does not belong to the specified sale",
      404,
    );
  }

  const answer =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.findUnique({
      where: { shopping_mall_sale_question_id: props.questionId },
    });

  if (!answer) {
    throw new HttpException("Answer not found", 404);
  }

  return {
    id: answer.id,
    title: answer.title,
    body: answer.body,
    shopping_mall_seller_id: answer.shopping_mall_seller_id,
    shopping_mall_seller_session_id: answer.shopping_mall_seller_session_id,
    shopping_mall_sale_question_id: answer.shopping_mall_sale_question_id,
    created_at: toISOStringSafe(answer.created_at),
    updated_at: toISOStringSafe(answer.updated_at),
    deleted_at: answer.deleted_at
      ? toISOStringSafe(answer.deleted_at)
      : undefined,
  };
}
