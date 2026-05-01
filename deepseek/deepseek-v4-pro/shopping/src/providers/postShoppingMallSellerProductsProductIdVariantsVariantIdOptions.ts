import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductVariantOptionValueCollector } from "../collectors/ShoppingMallProductVariantOptionValueCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantOptionValueTransformer } from "../transformers/ShoppingMallProductVariantOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdVariantsVariantIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantOptionValue.ICreate;
}): Promise<IShoppingMallProductVariantOptionValue> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Only the product owner can manage variant options",
      403,
    );
  }
  await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.variantId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const existingOption =
    await MyGlobal.prisma.shopping_mall_product_variant_option_values.findFirst(
      {
        where: {
          shopping_mall_product_variant_id: props.variantId,
          key: props.body.key,
        },
        select: {
          id: true,
        },
      },
    );
  if (existingOption !== null) {
    throw new HttpException("Option key already exists for this variant", 409);
  }
  const record =
    await MyGlobal.prisma.shopping_mall_product_variant_option_values.create({
      data: await ShoppingMallProductVariantOptionValueCollector.collect({
        body: props.body,
        shoppingMallProductVariants: { id: props.variantId },
      }),
      ...ShoppingMallProductVariantOptionValueTransformer.select(),
    });
  return await ShoppingMallProductVariantOptionValueTransformer.transform(
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
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallSellerProductsProductIdVariantsVariantIdOptions(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductVariantOptionValue.ICreate;
// }): Promise<IShoppingMallProductVariantOptionValue> {
//   const record = await MyGlobal.prisma.shopping_mall_product_variant_option_values.create({
//     data: await ShoppingMallProductVariantOptionValueCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallProductVariantOptionValueTransformer.select(),
//   });
//   return await ShoppingMallProductVariantOptionValueTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------