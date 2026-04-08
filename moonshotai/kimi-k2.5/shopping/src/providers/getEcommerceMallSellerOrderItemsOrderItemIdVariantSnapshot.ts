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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantSnapshotTransformer } from "../transformers/EcommerceMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerOrderItemsOrderItemIdVariantSnapshot(props: {
  seller: SellerPayload;
  orderItemId: string;
}): Promise<IEcommerceMallProductVariantSnapshot> {
  // Query the order item and get the variant snapshot reference through snapshots
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        snapshot: {
          select: {
            id: true,
            product_variant_snapshot_id: true,
          },
        },
      },
    });
  // The order item snapshot might not have a variant snapshot reference
  const variantSnapshotId = orderItem.snapshot?.product_variant_snapshot_id;
  if (!variantSnapshotId) {
    throw new HttpException(
      "Variant snapshot not found for this order item",
      404,
    );
  }
  // Query the product variant snapshot using the transformer
  const variantSnapshot =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUniqueOrThrow(
      {
        where: { id: variantSnapshotId },
        ...EcommerceMallProductVariantSnapshotTransformer.select(),
      },
    );
  return await EcommerceMallProductVariantSnapshotTransformer.transform(
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerOrderItemsOrderItemIdVariantSnapshot(props: {
//   seller: SellerPayload;
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