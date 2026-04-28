import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformProductVariantCollector } from "../collectors/EcommercePlatformProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformProductVariantTransformer } from "../transformers/EcommercePlatformProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommercePlatformProductVariant.ICreate;
}): Promise<IEcommercePlatformProductVariant> {
  const product =
    await MyGlobal.prisma.ecommerce_platform_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_platform_seller_profile_id: true,
      },
    });
  if (product.ecommerce_platform_seller_profile_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existing =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findFirst({
      where: {
        ecommerce_platform_product_id: props.productId,
        sku_code: props.body.skuCode,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existing !== null) {
    throw new HttpException("SKU code already exists for this product", 409);
  }
  const keys = new Set(props.body.options.map((o) => o.attributeKey));
  if (keys.size !== props.body.options.length) {
    throw new HttpException("Duplicate attribute keys in options array", 400);
  }
  const variant = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.ecommerce_platform_product_variants.create({
      data: await EcommercePlatformProductVariantCollector.collect({
        body: props.body,
        ecommercePlatformProducts: product,
      }),
    });
    await tx.ecommerce_platform_inventory_records.create({
      data: {
        id: v4(),
        ecommerce_platform_product_variant_id: created.id,
        quantity_delta: 0,
        reason: "Initial inventory record",
        created_at: new Date(),
      },
    });
    return created;
  });
  const record =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findUniqueOrThrow(
      {
        where: {
          id: variant.id,
        },
        ...EcommercePlatformProductVariantTransformer.select(),
      },
    );
  return await EcommercePlatformProductVariantTransformer.transform(record);
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
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformSellerProductsProductIdVariants(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformProductVariant.ICreate;
// }): Promise<IEcommercePlatformProductVariant> {
//   const record = await MyGlobal.prisma.ecommerce_platform_product_variants.create({
//     data: await EcommercePlatformProductVariantCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommercePlatformProductVariantTransformer.select(),
//   });
//   return await EcommercePlatformProductVariantTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------