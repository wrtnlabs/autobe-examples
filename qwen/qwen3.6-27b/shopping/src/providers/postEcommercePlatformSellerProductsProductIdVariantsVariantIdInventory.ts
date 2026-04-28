import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformInventoryRecordCollector } from "../collectors/EcommercePlatformInventoryRecordCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformInventoryRecordTransformer } from "../transformers/EcommercePlatformInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformSellerProductsProductIdVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommercePlatformInventoryRecord.ICreate;
}): Promise<IEcommercePlatformInventoryRecord> {
  const variant =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findUniqueOrThrow(
      {
        where: { id: props.variantId },
        select: {
          id: true,
          ecommerce_platform_product_id: true,
          product: {
            select: {
              ecommerce_platform_seller_profile_id: true,
              sellerProfile: {
                select: {
                  seller: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );
  if (variant.ecommerce_platform_product_id !== props.productId) {
    throw new HttpException(
      "Product variant does not belong to the specified product",
      404,
    );
  }
  if (variant.product.sellerProfile.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.quantity_delta === 0) {
    throw new HttpException("quantity_delta must be non-zero", 400);
  }
  const record =
    await MyGlobal.prisma.ecommerce_platform_inventory_records.create({
      data: await EcommercePlatformInventoryRecordCollector.collect({
        body: props.body,
        ecommercePlatformProductVariants: variant,
      }),
      ...EcommercePlatformInventoryRecordTransformer.select(),
    });
  return await EcommercePlatformInventoryRecordTransformer.transform(record);
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
// import { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformSellerProductsProductIdVariantsVariantIdInventory(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformInventoryRecord.ICreate;
// }): Promise<IEcommercePlatformInventoryRecord> {
//   const record = await MyGlobal.prisma.ecommerce_platform_inventory_records.create({
//     data: await EcommercePlatformInventoryRecordCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommercePlatformInventoryRecordTransformer.select(),
//   });
//   return await EcommercePlatformInventoryRecordTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------