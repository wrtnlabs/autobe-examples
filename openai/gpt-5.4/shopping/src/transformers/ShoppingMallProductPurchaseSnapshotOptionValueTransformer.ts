import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductPurchaseSnapshotOptionValueTransformer {
  export type Payload =
    Prisma.shopping_mall_product_purchase_snapshot_option_valuesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_product_purchase_snapshot_id: true,
        option_name: true,
        option_value: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_product_purchase_snapshot_option_valuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductPurchaseSnapshotOptionValue> {
    return {
      id: input.id,
      productPurchaseSnapshot: {
        id: input.shopping_mall_product_purchase_snapshot_id,
      } as IShoppingMallProductPurchaseSnapshot,
      option_name: input.option_name,
      option_value: input.option_value,
      display_order: input.display_order,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
