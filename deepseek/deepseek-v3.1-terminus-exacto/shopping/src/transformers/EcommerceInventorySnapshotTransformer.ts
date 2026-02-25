import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import { IEcommerceInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventorySnapshot";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceInventoryRecordTransformer } from "./EcommerceInventoryRecordTransformer";

export namespace EcommerceInventorySnapshotTransformer {
  export type Payload = Prisma.ecommerce_inventory_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        actor_type: true,
        actor_id: true,
        change_reason: true,
        previous_quantity: true,
        new_quantity: true,
        previous_reason: true,
        new_reason: true,
        inventoryRecord: EcommerceInventoryRecordTransformer.select(),
      },
    } satisfies Prisma.ecommerce_inventory_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceInventorySnapshot> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      actor_type: input.actor_type,
      actor_id: input.actor_id,
      change_reason: input.change_reason,
      previous_quantity: input.previous_quantity,
      new_quantity: input.new_quantity,
      previous_reason: input.previous_reason ?? null,
      new_reason: input.new_reason,
      inventoryRecord: await EcommerceInventoryRecordTransformer.transform(
        input.inventoryRecord,
      ),
    };
  }
}
