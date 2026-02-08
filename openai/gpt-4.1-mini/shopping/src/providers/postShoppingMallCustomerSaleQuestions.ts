import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSaleQuestionCollector } from "../collectors/ShoppingMallSaleQuestionCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerSaleQuestions(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleQuestion.ICreate;
}): Promise<IShoppingMallSaleQuestion> {
  // Extract saleId safely with proper type
  const saleId = (props.body as any).shopping_mall_sale_id as
    | string
    | undefined;
  if (saleId === undefined) throw new HttpException("Sale not found", 404);
  // Fetch sale info
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: saleId },
  });
  if (sale === null) throw new HttpException("Sale not found", 404);
  // Fetch customer info
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customer.id },
  });
  if (customer === null) throw new HttpException("Customer not found", 404);
  // Cast props.body to the expected type for the collector
  const bodyForCollect = props.body as {
    title: string;
    body: string;
    status: string;
    shopping_mall_sale_id: string;
  };
  // Collect data
  const data = await ShoppingMallSaleQuestionCollector.collect({
    body: bodyForCollect,
    sale,
    customer,
  });
  // Create in DB
  const created = await MyGlobal.prisma.shopping_mall_sale_questions.create({
    data,
  });
  // Return converting Date fields using toISOStringSafe
  return {
    id: created.id,
    shopping_mall_sale_id: created.shopping_mall_sale_id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    title: created.title,
    body: created.body,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
