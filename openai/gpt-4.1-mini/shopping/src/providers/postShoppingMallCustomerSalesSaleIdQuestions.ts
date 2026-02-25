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
import { ShoppingMallSaleQuestionCollector } from "../collectors/ShoppingMallSaleQuestionCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSaleAtSummaryTransformer } from "../transformers/ShoppingMallSaleAtSummaryTransformer";
import { ShoppingMallSaleQuestionTransformer } from "../transformers/ShoppingMallSaleQuestionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerSalesSaleIdQuestions(props: {
  customer: CustomerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleQuestion.ICreate;
}): Promise<IShoppingMallSaleQuestion> {
  if (!props.body.title || props.body.title.trim() === "") {
    throw new HttpException("Title must be a non-empty string.", 400);
  }
  if (!props.body.body || props.body.body.trim() === "") {
    throw new HttpException("Body must be a non-empty string.", 400);
  }
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: props.saleId },
    ...ShoppingMallSaleAtSummaryTransformer.select(),
  });
  if (!sale) {
    throw new HttpException("Sale not found.", 404);
  }
  const createInput = await ShoppingMallSaleQuestionCollector.collect({
    body: props.body,
    sale: { id: sale.id },
    customer: { id: props.customer.id },
  });
  const created = await MyGlobal.prisma.shopping_mall_sale_questions.create({
    data: createInput,
    ...ShoppingMallSaleQuestionTransformer.select(),
  });
  return await ShoppingMallSaleQuestionTransformer.transform(created);
}
