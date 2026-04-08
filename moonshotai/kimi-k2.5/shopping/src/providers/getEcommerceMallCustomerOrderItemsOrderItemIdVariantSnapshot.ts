import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallProductVariantSnapshotTransformer } from "../transformers/EcommerceMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrderItemsOrderItemIdVariantSnapshot(props: {
  customer: CustomerPayload;
  orderItemId: string;
}): Promise<IEcommerceMallProductVariantSnapshot> {
  // Verify order item exists and belongs to customer's order
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: props.orderItemId,
      },
      select: {
        id: true,
        order: {
          select: {
            ecommerce_mall_customer_id: true,
          },
        },
        ecommerce_mall_product_variant_snapshot_id: true,
      },
    });
  // Authorization check: customer must own this order
  if (orderItem.order.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch the variant snapshot
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUniqueOrThrow(
      {
        where: {
          id: orderItem.ecommerce_mall_product_variant_snapshot_id,
        },
        ...EcommerceMallProductVariantSnapshotTransformer.select(),
      },
    );
  return await EcommerceMallProductVariantSnapshotTransformer.transform(
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerOrderItemsOrderItemIdVariantSnapshot(props: {
//   customer: CustomerPayload;
//   orderItemId: string;
// }): Promise<IEcommerceMallProductVariantSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findFirstOrThrow({
//     ...EcommerceMallProductVariantSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductVariantSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------