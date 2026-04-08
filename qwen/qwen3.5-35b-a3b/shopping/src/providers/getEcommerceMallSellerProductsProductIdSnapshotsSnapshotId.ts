import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductSnapshotTransformer } from "../transformers/EcommerceMallProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductsProductIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findUniqueOrThrow({
      ...EcommerceMallProductSnapshotTransformer.select(),
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: {
          select: {
            name: true,
            created_at: true,
            updated_at: true,
            base_price: true,
            id: true,
            deleted_at: true,
            category_id: true,
            seller_id: true,
            description: true,
          },
        },
        variantSnapshot: {
          select: {
            id: true,
            sku_code: true,
            option_values: true,
            price: true,
            stock_quantity: true,
            created_at: true,
            updated_at: true,
            productVariant: { select: { id: true } },
            product: { select: { id: true } },
            seller: { select: { id: true } },
            productSnapshots: { select: { id: true } },
          },
        },
        sellerSnapshot: {
          select: {
            id: true,
            shop_name: true,
            shop_description: true,
            shop_logo: true,
            created_at: true,
            seller: true,
            productSnapshots: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            sort_order: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
      where: {
        id: props.snapshotId,
        ecommerce_mall_product_id: props.productId,
      },
    });
  const productSellerId = record.product.seller_id;
  if (productSellerId !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallProductSnapshotTransformer.transform(record);
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
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSnapshot";
// import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerProductsProductIdSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallProductSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_snapshots.findFirstOrThrow({
//     ...EcommerceMallProductSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------