import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";

export namespace ShoppingMallOrderStatusLogAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_status_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        previous_status: true,
        new_status: true,
        reason: true,
        changedBy: ShoppingMallCustomerAtSummaryTransformer.select(),
        order: true,
      },
    } satisfies Prisma.shopping_mall_order_status_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderStatusLog.ISummary> {
    return {
      id: input.id,
      previous_status: input.previous_status,
      new_status: input.new_status,
      reason: input.reason,
      changed_by: input.changedBy
        ? await ShoppingMallCustomerAtSummaryTransformer.transform(
            input.changedBy,
          )
        : null,
    };
  }
}
