import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductVariantSnapshotTransformer {
  export type Payload =
    Prisma.shopping_mall_product_variant_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        version: true,
        sku_code: true,
        price: true,
        previous_sku_code: true,
        previous_price: true,
        changed_at: true,
        created_at: true,
        updated_at: true,
        variant: true,
        actor: true,
        productSnapshotVariants: true,
        cartItems: true,
        orderItems: true,
      },
    } satisfies Prisma.shopping_mall_product_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantSnapshot> {
    return {
      id: input.id,
      product_variant_id: input.variant.id,
      changed_by: input.actor.id,
      version: input.version,
      sku_code: input.sku_code,
      price: input.price,
      previous_sku_code: input.previous_sku_code,
      previous_price: input.previous_price,
      changed_at: input.changed_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
