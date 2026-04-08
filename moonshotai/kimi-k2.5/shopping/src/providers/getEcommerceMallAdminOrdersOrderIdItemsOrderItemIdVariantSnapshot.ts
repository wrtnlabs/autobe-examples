import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductVariantSnapshotAtInvertTransformer } from "../transformers/EcommerceMallProductVariantSnapshotAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminOrdersOrderIdItemsOrderItemIdVariantSnapshot(props: {
  admin: AdminPayload;
  orderId: string;
  orderItemId: string;
}): Promise<IEcommerceMallProductVariantSnapshot.IInvert> {
  // Step 1: Validate order exists (admin has access to all orders)
  await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // Step 2: Locate the order item within the order and get its snapshot linkage
  const orderItemSnapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findFirst({
      where: {
        order_item_id: props.orderItemId,
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        product_variant_snapshot_id: true,
      },
    });
  if (!orderItemSnapshot || !orderItemSnapshot.product_variant_snapshot_id) {
    throw new HttpException("Variant snapshot not found", 404);
  }
  // Step 3: Verify order item belongs to the specified order
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: props.orderItemId,
        order_id: props.orderId,
      },
      select: {
        id: true,
        variant_id: true,
      },
    });
  // Step 4: Fetch the variant snapshot with all related data
  const variantSnapshot =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findFirstOrThrow(
      {
        where: {
          id: orderItemSnapshot.product_variant_snapshot_id,
        },
        ...EcommerceMallProductVariantSnapshotAtInvertTransformer.select(),
      },
    );
  // Step 5: Verify snapshot's variant matches the order item's variant
  if (variantSnapshot.product_variant_id !== orderItem.variant_id) {
    throw new HttpException("Variant snapshot consistency error", 500);
  }
  // Step 6: Transform and return
  return await EcommerceMallProductVariantSnapshotAtInvertTransformer.transform(
    variantSnapshot,
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
// import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
// import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminOrdersOrderIdItemsOrderItemIdVariantSnapshot(props: {
//   admin: AdminPayload;
//   orderId: string;
//   orderItemId: string;
// }): Promise<IEcommerceMallProductVariantSnapshot.IInvert> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findFirstOrThrow({
//     ...EcommerceMallProductVariantSnapshotAtInvertTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductVariantSnapshotAtInvertTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------