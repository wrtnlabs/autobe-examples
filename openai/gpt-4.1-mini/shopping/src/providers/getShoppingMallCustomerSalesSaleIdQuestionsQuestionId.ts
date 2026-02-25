import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSaleQuestionTransformer } from "../transformers/ShoppingMallSaleQuestionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerSalesSaleIdQuestionsQuestionId(props: {
  customer: CustomerPayload;
  saleId: string & tags.Format<"uuid">;
  questionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleQuestion> {
  // Retrieve the sale question with related sale and customer data
  const question =
    await MyGlobal.prisma.shopping_mall_sale_questions.findUniqueOrThrow({
      where: { id: props.questionId },
      ...ShoppingMallSaleQuestionTransformer.select(),
    });
  // Verify the question's saleId matches the requested saleId
  if (question.sale.id !== props.saleId) {
    throw new HttpException("Sale question not found for given sale", 404);
  }
  // Authorization: allow if requester is question author or the seller of the sale
  if (
    question.customer.id !== props.customer.id &&
    question.sale.seller.id !== props.customer.id
  ) {
    throw new HttpException("Access to sale question is forbidden", 403);
  }
  // Transform and return the response DTO
  return await ShoppingMallSaleQuestionTransformer.transform(question);
}
