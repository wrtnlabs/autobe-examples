import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallCustomerSalesSaleIdQuestionsQuestionId(props: {
  customer: CustomerPayload;
  saleId: string & tags.Format<"uuid">;
  questionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: props.saleId, deleted_at: null },
  });
  if (sale === null) {
    throw new HttpException("Sale not found", 404);
  }
  const question =
    await MyGlobal.prisma.shopping_mall_sale_questions.findUnique({
      where: { id: props.questionId },
    });
  if (question === null || question.shopping_mall_sale_id !== props.saleId) {
    throw new HttpException("Question not found for this sale", 404);
  }
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: sale.seller_id },
  });
  if (seller === null) {
    throw new HttpException("Seller not found", 404);
  }
  if (seller.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_sale_questions.delete({
      where: { id: props.questionId },
    });
  });
}
