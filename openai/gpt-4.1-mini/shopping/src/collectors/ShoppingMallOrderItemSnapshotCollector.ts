import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderItemSnapshotCollector {
  export async function collect(props: {
    body: IShoppingMallOrderItemSnapshot.ICreate;
    orderItem: IEntity;
    order: IEntity;
  }) {
    const id: string = v4();
    function toISOStringSafe(date: unknown): string | null {
      if (date instanceof Date) return date.toISOString();
      if (typeof date === "string") return date;
      return null;
    }
    const createdAt =
      toISOStringSafe((props.body as any).created_at) ??
      toISOStringSafe(new Date())!;
    const updatedAt =
      toISOStringSafe((props.body as any).updated_at) ??
      toISOStringSafe(new Date())!;
    const deletedAt = toISOStringSafe((props.body as any).deleted_at);
    return {
      id,
      product_name: (props.body as any).product_name,
      variant_sku: (props.body as any).variant_sku,
      variant_option_values: (props.body as any).variant_option_values,
      unit_price: (props.body as any).unit_price,
      quantity: (props.body as any).quantity,
      item_status: (props.body as any).item_status,
      seller_shop_name: (props.body as any).seller_shop_name,
      seller_logo_uri: (props.body as any).seller_logo_uri ?? null,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: deletedAt,
      orderItem: { connect: { id: props.orderItem.id } },
      order: { connect: { id: props.order.id } },
    } satisfies Prisma.shopping_mall_order_item_snapshotsCreateInput;
  }
}
