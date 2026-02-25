import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleQuestionReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSaleQuestionReportAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_sale_questionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sale: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_sale_questionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSaleQuestionReport.ISummary> {
    return {
      id: input.id,
      saleId: input.sale.id,
      questionCount: 0,
      pendingCount: 0,
      answeredCount: 0,
      rejectedCount: 0,
      lastAskedAt: null,
    };
  }
}
