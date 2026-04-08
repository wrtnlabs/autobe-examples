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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallProductVariantSnapshotAtInvertTransformer } from "../transformers/EcommerceMallProductVariantSnapshotAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrdersOrderIdItemsOrderItemIdVariantSnapshot(props: {
  customer: CustomerPayload;
  orderId: string;
  orderItemId: string;
}): Promise<IEcommerceMallProductVariantSnapshot.IInvert> {
  // Verify order exists and belongs to customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
    where: {
      id: props.orderId,
      ecommerce_mall_customer_id: props.customer.id,
    },
    select: { id: true },
  });
  // Find order item and get snapshot relation
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: props.orderItemId,
        ecommerce_mall_order_id: order.id,
      },
      select: {
        id: true,
        ecommerce_mall_product_variant_id: true,
        snapshot: {
          select: {
            ecommerce_mall_product_variant_snapshot_id: true,
          },
        },
      },
    });
  // Get variant snapshot ID from order item snapshot
  const variantSnapshotId =
    orderItem.snapshot?.ecommerce_mall_product_variant_snapshot_id;
  if (!variantSnapshotId) {
    throw new HttpException("Variant snapshot not found", 404);
  }
  // Fetch the variant snapshot with transformer select
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findFirstOrThrow(
      {
        where: {
          id: variantSnapshotId,
        },
        ...EcommerceMallProductVariantSnapshotAtInvertTransformer.select(),
      },
    );
  return await EcommerceMallProductVariantSnapshotAtInvertTransformer.transform(
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
// export async function getEcommerceMallCustomerOrdersOrderIdItemsOrderItemIdVariantSnapshot(props: {
//   customer: CustomerPayload;
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