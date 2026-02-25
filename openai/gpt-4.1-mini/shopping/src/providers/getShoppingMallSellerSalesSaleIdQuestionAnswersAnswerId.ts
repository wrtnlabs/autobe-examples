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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleQuestionAnswerTransformer } from "../transformers/ShoppingMallSaleQuestionAnswerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerSalesSaleIdQuestionAnswersAnswerId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  answerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleQuestionAnswer> {
  const answer =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.findUniqueOrThrow(
      {
        where: { id: props.answerId },
        ...ShoppingMallSaleQuestionAnswerTransformer.select(),
      },
    );
  if (answer.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (answer.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const saleQuestion = answer.saleQuestion;
  if (
    !saleQuestion ||
    !saleQuestion.sale ||
    saleQuestion.sale.id !== props.saleId
  ) {
    throw new HttpException("Not Found", 404);
  }
  return await ShoppingMallSaleQuestionAnswerTransformer.transform(answer);
}
