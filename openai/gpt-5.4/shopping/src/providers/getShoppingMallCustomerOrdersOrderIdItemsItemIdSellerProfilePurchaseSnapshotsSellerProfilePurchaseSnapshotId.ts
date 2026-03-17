import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSellerProfilePurchaseSnapshotTransformer } from "../transformers/ShoppingMallSellerProfilePurchaseSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrdersOrderIdItemsItemIdSellerProfilePurchaseSnapshotsSellerProfilePurchaseSnapshotId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  sellerProfilePurchaseSnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerProfilePurchaseSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_seller_profile_purchase_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.sellerProfilePurchaseSnapshotId,
          shopping_mall_order_item_id: props.itemId,
          orderItem: {
            shopping_mall_order_id: props.orderId,
            order: {
              shopping_mall_customer_id: props.customer.id,
            },
          },
        },
        ...ShoppingMallSellerProfilePurchaseSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallSellerProfilePurchaseSnapshotTransformer.transform(
    snapshot,
  );
}
