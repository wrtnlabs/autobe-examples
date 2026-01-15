import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductQuestion";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductQuestionTransformer {
  export type Payload = Prisma.shopping_mall_product_questionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: true,
        customer: true,
        shopping_mall_product_answers: true,
      },
    } satisfies Prisma.shopping_mall_product_questionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductQuestion> {
    return {
      id: input.id,
      question: input.title,
      createdAt: input.created_at.toISOString(),
      isDeleted: input.deleted_at !== null ? true : false,
      productId: input.product.id,
      isAnswered: input.shopping_mall_product_answers !== null,
      isVerified: false,
    };
  }
}
