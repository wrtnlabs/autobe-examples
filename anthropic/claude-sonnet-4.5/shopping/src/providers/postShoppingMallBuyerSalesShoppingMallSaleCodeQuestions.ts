import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function postShoppingMallBuyerSalesShoppingMallSaleCodeQuestions(props: {
  buyer: BuyerPayload;
  shoppingMallSaleCode: string;
  body: IShoppingMallSaleQuestion.ICreate;
}): Promise<IShoppingMallSaleQuestion> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.shoppingMallSaleCode,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException(
      `Product sale with code '${props.shoppingMallSaleCode}' not found`,
      404,
    );
  }

  const question = await MyGlobal.prisma.shopping_mall_sale_questions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_sale_id: sale.id,
      shopping_mall_buyer_id: props.buyer.id,
      shopping_mall_buyer_session_id: props.buyer.session_id,
      title: props.body.title,
      body: props.body.body,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });

  return {
    id: question.id,
    shopping_mall_sale_id: question.shopping_mall_sale_id,
    shopping_mall_buyer_id: question.shopping_mall_buyer_id,
    shopping_mall_buyer_session_id: question.shopping_mall_buyer_session_id,
    title: question.title,
    body: question.body,
    created_at: toISOStringSafe(question.created_at),
    updated_at: toISOStringSafe(question.updated_at),
    deleted_at:
      question.deleted_at === null
        ? undefined
        : toISOStringSafe(question.deleted_at),
    sale: undefined,
    buyer: undefined,
    answer: undefined,
  };
}
