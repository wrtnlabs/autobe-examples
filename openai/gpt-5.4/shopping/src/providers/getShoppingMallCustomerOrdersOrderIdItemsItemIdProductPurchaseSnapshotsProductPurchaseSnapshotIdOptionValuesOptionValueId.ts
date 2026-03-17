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
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductPurchaseSnapshotOptionValueTransformer } from "../transformers/ShoppingMallProductPurchaseSnapshotOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrdersOrderIdItemsItemIdProductPurchaseSnapshotsProductPurchaseSnapshotIdOptionValuesOptionValueId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  productPurchaseSnapshotId: string & tags.Format<"uuid">;
  optionValueId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductPurchaseSnapshotOptionValue> {
  const optionValue =
    await MyGlobal.prisma.shopping_mall_product_purchase_snapshot_option_values.findFirstOrThrow(
      {
        where: {
          id: props.optionValueId,
          deleted_at: null,
          shopping_mall_product_purchase_snapshot_id:
            props.productPurchaseSnapshotId,
          productPurchaseSnapshot: {
            id: props.productPurchaseSnapshotId,
            deleted_at: null,
            shopping_mall_order_item_id: props.itemId,
            orderItem: {
              id: props.itemId,
              deleted_at: null,
              shopping_mall_order_id: props.orderId,
              order: {
                id: props.orderId,
                shopping_mall_customer_id: props.customer.id,
                deleted_at: null,
              },
            },
          },
        },
        ...ShoppingMallProductPurchaseSnapshotOptionValueTransformer.select(),
      },
    );
  return await ShoppingMallProductPurchaseSnapshotOptionValueTransformer.transform(
    optionValue,
  );
}
