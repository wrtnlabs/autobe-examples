import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerSalesSaleIdQuestionAnswersAnswerId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  answerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the answer including the question id
  const answer =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.findUnique({
      where: { id: props.answerId },
      select: {
        id: true,
        seller_id: true,
        shopping_mall_sale_question_id: true,
      },
    });
  if (answer === null) {
    throw new HttpException("Not Found", 404);
  }
  // Find the question using shopping_mall_sale_question_id
  const question =
    await MyGlobal.prisma.shopping_mall_sale_questions.findUnique({
      where: { id: answer.shopping_mall_sale_question_id },
      select: {
        id: true,
        shopping_mall_sale_id: true,
      },
    });
  if (question === null || question.shopping_mall_sale_id !== props.saleId) {
    throw new HttpException("Not Found", 404);
  }
  if (answer.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_sale_question_answers.delete({
    where: { id: props.answerId },
  });
}
