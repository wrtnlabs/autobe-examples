import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function postShoppingMallBuyerSalesSaleCodeQuestions(props: {
  buyer: BuyerPayload;
  saleCode: string;
  body: IShoppingMallSaleQuestion.ICreate;
}): Promise<IShoppingMallSaleQuestion> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Product sale not found", 404);
  }

  const now = new Date();
  const questionId = v4();

  const created = await MyGlobal.prisma.shopping_mall_sale_questions.create({
    data: {
      id: questionId,
      shopping_mall_sale_id: sale.id,
      shopping_mall_buyer_id: props.buyer.id,
      shopping_mall_buyer_session_id: props.buyer.session_id,
      title: props.body.title,
      body: props.body.body,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_sale_id: created.shopping_mall_sale_id,
    shopping_mall_buyer_id: created.shopping_mall_buyer_id,
    shopping_mall_buyer_session_id: created.shopping_mall_buyer_session_id,
    title: created.title,
    body: created.body,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    sale: undefined,
    buyer: undefined,
    answer: undefined,
  };
}
