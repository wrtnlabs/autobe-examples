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
  }) {
    const id: string = v4();
    return {
      id,
      product_name: props.body.productName,
      variant_sku: props.body.variantSku,
      variant_option_values: props.body.variantOptionValues,
      unit_price: props.body.unitPrice,
      quantity: props.body.quantity,
      item_status: props.body.itemStatus,
      seller_shop_name: props.body.sellerShopName,
      seller_logo_uri: props.body.sellerLogoUri ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.body.shoppingMallOrderItemId } },
      order: { connect: { id: props.body.shoppingMallOrderId } },
    } satisfies Prisma.shopping_mall_order_item_snapshotsCreateInput;
  }
}
