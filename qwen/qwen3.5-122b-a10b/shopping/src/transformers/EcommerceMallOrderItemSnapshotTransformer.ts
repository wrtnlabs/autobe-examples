import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";

export namespace EcommerceMallOrderItemSnapshotTransformer {
  export type Payload = Prisma.ecommerce_mall_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_type: true,
        created_at: true,
        previous_values: true,
        current_values: true,
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
        changedBy: EcommerceMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItemSnapshot> {
    return {
      id: input.id,
      orderItemId: input.orderItem.id,
      changedById: input.changedBy?.id ?? null,
      snapshotType: input.snapshot_type as
        | "purchase"
        | "status_change"
        | "cancellation"
        | "refund",
      createdAt: input.created_at.toISOString(),
      previousValues: input.previous_values
        ? JSON.parse(input.previous_values)
        : null,
      currentValues: JSON.parse(input.current_values),
      orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      changedBy: input.changedBy
        ? await EcommerceMallAdminAtSummaryTransformer.transform(
            input.changedBy,
          )
        : null,
    };
  }
}
