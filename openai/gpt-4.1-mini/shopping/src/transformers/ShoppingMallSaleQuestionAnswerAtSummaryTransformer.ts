import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallSaleQuestionAnswerAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_sale_question_answersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        body: true,
        shopping_mall_sale_question_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        saleQuestion: {
          select: { id: true },
        },
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_sale_question_answersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSaleQuestionAnswer.ISummary> {
    return {
      id: input.id,
      title: input.title,
      body: input.body,
      shoppingMallSaleQuestionId: input.shopping_mall_sale_question_id,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
