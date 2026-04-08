import { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceOrderItemSnapshotTransformer {
  export type Payload = Prisma.ecommerce_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        product_name: true,
        product_description: true,
        seller_shop_name: true,
        seller_logo_url: true,
        base_price: true,
        created_at: true,
        ecommerceOrderItem: {
          select: {
            id: true,
          },
        },
        ecommerceOrderItemSnapshotVariant: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceOrderItemSnapshot> {
    return {
      id: input.id,
      ecommerce_order_item_id: input.ecommerceOrderItem.id,
      product_name: input.product_name,
      product_description: input.product_description ?? null,
      seller_shop_name: input.seller_shop_name,
      seller_logo_url: input.seller_logo_url ?? null,
      base_price: input.base_price,
      created_at: input.created_at.toISOString(),
    } satisfies IEcommerceOrderItemSnapshot;
  }
}
