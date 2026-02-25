import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSaleQuestionAtBulkUpdateTransformer {
  export type Payload = Prisma.shopping_mall_sale_questionsGetPayload<
    ReturnType<typeof select>
  >[];
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        body: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sale: true,
        customer: true,
        saleQuestionAnswer: true,
      },
    } satisfies Prisma.shopping_mall_sale_questionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSaleQuestion.IBulkUpdate> {
    return {
      updates: input.map((entry) => ({
        id: entry.id,
        title: entry.title,
        body: entry.body,
        status: entry.status,
        createdAt: entry.created_at.toISOString(),
        updatedAt: entry.updated_at.toISOString(),
        deletedAt: entry.deleted_at ? entry.deleted_at.toISOString() : null,
      })),
    };
  }
}
