import { IEcommerceOrderItemSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariant";
import { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceOrderItemSnapshotVariantOptionTransformer } from "./EcommerceOrderItemSnapshotVariantOptionTransformer";

export namespace EcommerceOrderItemSnapshotVariantTransformer {
  export type Payload = Prisma.ecommerce_order_item_snapshot_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        variant_price: true,
        created_at: true,
        ecommerceOrderItemSnapshot: true,
        ecommerceOrderItemSnapshotVariantOptions:
          EcommerceOrderItemSnapshotVariantOptionTransformer.select(),
      },
    } satisfies Prisma.ecommerce_order_item_snapshot_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceOrderItemSnapshotVariant> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      variant_price: Number(input.variant_price),
      options: await ArrayUtil.asyncMap(
        input.ecommerceOrderItemSnapshotVariantOptions,
        EcommerceOrderItemSnapshotVariantOptionTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IEcommerceOrderItemSnapshotVariant;
  }
}
