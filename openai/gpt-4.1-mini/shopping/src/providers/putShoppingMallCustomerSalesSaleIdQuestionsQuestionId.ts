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

export async function putShoppingMallCustomerSalesSaleIdQuestionsQuestionId(props: {
  customer: CustomerPayload;
  saleId: string & tags.Format<"uuid">;
  questionId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleQuestion.IUpdate;
}): Promise<IShoppingMallSaleQuestion> {
  const existing =
    await MyGlobal.prisma.shopping_mall_sale_questions.findUniqueOrThrow({
      where: { id: props.questionId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        shopping_mall_sale_id: true,
      },
    });
  if (existing.shopping_mall_sale_id !== props.saleId) {
    throw new HttpException(
      "Question does not belong to the supplied sale",
      404,
    );
  }
  if (existing.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_sale_questions.update({
    where: { id: props.questionId },
    data: {
      title: props.body.title,
      body: props.body.body,
      status: props.body.status,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_sale_questions.findUniqueOrThrow({
      where: { id: props.questionId },
      ...ShoppingMallSaleQuestionTransformer.select(),
    });
  return await ShoppingMallSaleQuestionTransformer.transform(updated);
}
