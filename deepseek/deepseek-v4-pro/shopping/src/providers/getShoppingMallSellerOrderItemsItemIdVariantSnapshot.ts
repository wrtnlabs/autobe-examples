import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderItemVariantSnapshotTransformer } from "../transformers/ShoppingMallOrderItemVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerOrderItemsItemIdVariantSnapshot(props: {
  seller: SellerPayload;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemVariantSnapshot> {
  // Verify the seller owns the product associated with this order item
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        productVariant: {
          select: {
            product: {
              select: { shopping_mall_seller_id: true },
            },
          },
        },
      },
    });
  if (
    orderItem.productVariant.product.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the variant snapshot
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_item_variant_snapshots.findFirstOrThrow(
      {
        where: { shopping_mall_order_item_id: props.itemId },
        ...ShoppingMallOrderItemVariantSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallOrderItemVariantSnapshotTransformer.transform(
    snapshot,
  );
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallSellerOrderItemsItemIdVariantSnapshot(props: {
//   seller: SellerPayload;
//   itemId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallOrderItemVariantSnapshot> {
//   const record = await MyGlobal.prisma.shopping_mall_order_item_variant_snapshots.findFirstOrThrow({
//     ...ShoppingMallOrderItemVariantSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallOrderItemVariantSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------