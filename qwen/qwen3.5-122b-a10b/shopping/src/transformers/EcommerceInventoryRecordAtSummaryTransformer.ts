import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceProductVariantAtSummaryTransformer } from "./EcommerceProductVariantAtSummaryTransformer";

export namespace EcommerceInventoryRecordAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        productVariant: EcommerceProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceInventoryRecord.ISummary> {
    return {
      id: input.id,
      quantity_change: input.quantity_change,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      productVariant:
        await EcommerceProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
    } satisfies IEcommerceInventoryRecord.ISummary;
  }
}
