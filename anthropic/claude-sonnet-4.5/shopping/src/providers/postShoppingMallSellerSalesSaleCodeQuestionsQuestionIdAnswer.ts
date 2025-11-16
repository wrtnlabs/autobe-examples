import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerSalesSaleCodeQuestionsQuestionIdAnswer(props: {
  seller: SellerPayload;
  saleCode: string;
  questionId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleQuestionAnswer.ICreate;
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

  if (sale.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "You do not have permission to answer questions for this sale",
      403,
    );
  }

  const question = await MyGlobal.prisma.shopping_mall_sale_questions.findFirst(
    {
      where: {
        id: props.questionId,
        deleted_at: null,
      },
    },
  );

  if (!question) {
    throw new HttpException("Question not found", 404);
  }

  if (question.shopping_mall_sale_id !== sale.id) {
    throw new HttpException(
      "Question does not belong to the specified sale",
      404,
    );
  }

  const existingAnswer =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.findFirst({
      where: {
        shopping_mall_sale_question_id: props.questionId,
        deleted_at: null,
      },
    });

  if (existingAnswer) {
    throw new HttpException("An answer already exists for this question", 409);
  }

  const createdAnswer =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.create({
      data: {
        id: v4(),
        title: props.body.title,
        body: props.body.body,
        shopping_mall_seller_id: props.seller.id,
        shopping_mall_seller_session_id: props.seller.session_id,
        shopping_mall_sale_question_id: props.questionId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

  return {
    id: createdAnswer.id,
    title: createdAnswer.title,
    body: createdAnswer.body,
    shopping_mall_seller_id: createdAnswer.shopping_mall_seller_id,
    shopping_mall_seller_session_id:
      createdAnswer.shopping_mall_seller_session_id,
    shopping_mall_sale_question_id:
      createdAnswer.shopping_mall_sale_question_id,
    created_at: toISOStringSafe(createdAnswer.created_at),
    updated_at: toISOStringSafe(createdAnswer.updated_at),
    deleted_at:
      createdAnswer.deleted_at === null
        ? undefined
        : toISOStringSafe(createdAnswer.deleted_at),
  };
}
