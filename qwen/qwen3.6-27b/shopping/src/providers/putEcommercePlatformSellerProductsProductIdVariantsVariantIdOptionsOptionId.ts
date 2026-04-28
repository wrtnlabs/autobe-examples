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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformProductVariantOptionTransformer } from "../transformers/EcommercePlatformProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommercePlatformSellerProductsProductIdVariantsVariantIdOptionsOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IEcommercePlatformProductVariantOption.IUpdate;
}): Promise<IEcommercePlatformProductVariantOption> {
  // Validate ownership: seller → seller_profile → product → variant → option
  const optionWithVariantAndProduct =
    await MyGlobal.prisma.ecommerce_platform_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        select: {
          id: true,
          ecommerce_platform_product_variant_id: true,
          productVariant: {
            select: {
              id: true,
              ecommerce_platform_product_id: true,
            },
          },
        },
      },
    );
  if (optionWithVariantAndProduct.productVariant.id !== props.variantId) {
    throw new HttpException("Product variant not found", 404);
  }
  if (
    optionWithVariantAndProduct.productVariant.ecommerce_platform_product_id !==
    props.productId
  ) {
    throw new HttpException("Product variant not found", 404);
  }
  // Verify seller profile ownership
  const sellerProfile =
    await MyGlobal.prisma.ecommerce_platform_seller_profiles.findFirst({
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (sellerProfile === null) {
    throw new HttpException("Seller not found", 404);
  }
  // Verify product belongs to seller's profile
  const product = await MyGlobal.prisma.ecommerce_platform_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      ecommerce_platform_seller_profile_id: true,
      deleted_at: true,
    },
  });
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.ecommerce_platform_seller_profile_id !== sellerProfile.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check for duplicate attribute_key within the same variant (excluding soft-deleted options)
  if (props.body.attribute_key !== undefined) {
    const duplicate =
      await MyGlobal.prisma.ecommerce_platform_product_variant_options.findFirst(
        {
          where: {
            ecommerce_platform_product_variant_id:
              optionWithVariantAndProduct.ecommerce_platform_product_variant_id,
            attribute_key: props.body.attribute_key,
            deleted_at: null,
            id: { not: props.optionId },
          },
        },
      );
    if (duplicate !== null) {
      throw new HttpException("Duplicate attribute key for this variant", 409);
    }
  }
  // Update the option record
  await MyGlobal.prisma.ecommerce_platform_product_variant_options.update({
    where: { id: props.optionId },
    data: {
      ...(props.body.attribute_key !== undefined && {
        attribute_key: props.body.attribute_key,
      }),
      ...(props.body.attribute_value !== undefined && {
        attribute_value: props.body.attribute_value,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch and transform the updated option
  const updated =
    await MyGlobal.prisma.ecommerce_platform_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        ...EcommercePlatformProductVariantOptionTransformer.select(),
      },
    );
  return await EcommercePlatformProductVariantOptionTransformer.transform(
    updated,
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
// export async function putEcommercePlatformSellerProductsProductIdVariantsVariantIdOptionsOptionId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   optionId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformProductVariantOption.IUpdate;
// }): Promise<IEcommercePlatformProductVariantOption> {
//   await MyGlobal.prisma.ecommerce_platform_product_variant_options.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_platform_product_variant_options.findUniqueOrThrow({
//     where: { ... },
//     ...EcommercePlatformProductVariantOptionTransformer.select(),
//   });
//   return await EcommercePlatformProductVariantOptionTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------