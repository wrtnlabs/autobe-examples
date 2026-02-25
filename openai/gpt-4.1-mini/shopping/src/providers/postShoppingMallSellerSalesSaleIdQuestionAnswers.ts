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
import { ShoppingMallSaleQuestionAnswerCollector } from "../collectors/ShoppingMallSaleQuestionAnswerCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleQuestionAnswerTransformer } from "../transformers/ShoppingMallSaleQuestionAnswerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSalesSaleIdQuestionAnswers(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleQuestionAnswer.ICreate;
}): Promise<IShoppingMallSaleQuestionAnswer> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUniqueOrThrow({
    where: { id: props.saleId },
    select: { id: true, seller_id: true },
  });
  if (sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const question =
    await MyGlobal.prisma.shopping_mall_sale_questions.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_sale_question_id },
      select: { id: true, shopping_mall_sale_id: true },
    });
  if (question.shopping_mall_sale_id !== props.saleId) {
    throw new HttpException("Invalid question for sale", 403);
  }
  const createInput = await ShoppingMallSaleQuestionAnswerCollector.collect({
    body: props.body,
    saleQuestion: question,
    seller: { id: props.seller.id },
  });
  const created =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.create({
      data: createInput,
      ...ShoppingMallSaleQuestionAnswerTransformer.select(),
    });
  return await ShoppingMallSaleQuestionAnswerTransformer.transform(created);
}
