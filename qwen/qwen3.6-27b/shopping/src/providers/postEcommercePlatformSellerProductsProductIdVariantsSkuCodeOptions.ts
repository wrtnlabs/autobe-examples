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
import { EcommercePlatformProductVariantOptionCollector } from "../collectors/EcommercePlatformProductVariantOptionCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformProductVariantOptionTransformer } from "../transformers/EcommercePlatformProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformSellerProductsProductIdVariantsSkuCodeOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuCode: string;
  body: IEcommercePlatformProductVariantOption.ICreate;
}): Promise<IEcommercePlatformProductVariantOption> {
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
  const sellerProfile =
    await MyGlobal.prisma.ecommerce_platform_seller_profiles.findFirst({
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (
    sellerProfile === null ||
    sellerProfile.id !== product.ecommerce_platform_seller_profile_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findFirstOrThrow({
      where: {
        ecommerce_platform_product_id: props.productId,
        sku_code: props.skuCode,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const existingOption =
    await MyGlobal.prisma.ecommerce_platform_product_variant_options.findMany({
      where: {
        ecommerce_platform_product_variant_id: variant.id,
        attribute_key: props.body.attributeKey,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existingOption.length > 0) {
    throw new HttpException(
      "Duplicate attribute key not allowed for this variant",
      409,
    );
  }
  const record =
    await MyGlobal.prisma.ecommerce_platform_product_variant_options.create({
      data: await EcommercePlatformProductVariantOptionCollector.collect({
        body: props.body,
        ecommercePlatformProducts: {
          id: product.id,
        },
        ecommercePlatformProductVariants: {
          id: variant.id,
        },
      }),
      ...EcommercePlatformProductVariantOptionTransformer.select(),
    });
  return await EcommercePlatformProductVariantOptionTransformer.transform(
    record,
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
// import { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformSellerProductsProductIdVariantsSkuCodeOptions(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   skuCode: string;
//   body: IEcommercePlatformProductVariantOption.ICreate;
// }): Promise<IEcommercePlatformProductVariantOption> {
//   const record = await MyGlobal.prisma.ecommerce_platform_product_variant_options.create({
//     data: await EcommercePlatformProductVariantOptionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommercePlatformProductVariantOptionTransformer.select(),
//   });
//   return await EcommercePlatformProductVariantOptionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------