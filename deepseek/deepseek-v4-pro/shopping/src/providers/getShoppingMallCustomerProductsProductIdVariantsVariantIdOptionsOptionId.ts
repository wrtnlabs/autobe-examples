import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductVariantOptionValueTransformer } from "../transformers/ShoppingMallProductVariantOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerProductsProductIdVariantsVariantIdOptionsOptionId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariantOptionValue> {
  const option =
    await MyGlobal.prisma.shopping_mall_product_variant_option_values.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        ...ShoppingMallProductVariantOptionValueTransformer.select(),
      },
    );
  if (option.variant.id !== props.variantId) {
    throw new HttpException("Not Found", 404);
  }
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        product: {
          select: {
            id: true,
            deleted_at: true,
          },
        },
      },
    });
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  if (variant.product.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  return await ShoppingMallProductVariantOptionValueTransformer.transform(
    option,
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
// export async function getShoppingMallCustomerProductsProductIdVariantsVariantIdOptionsOptionId(props: {
//   customer: CustomerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   optionId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallProductVariantOptionValue> {
//   const record = await MyGlobal.prisma.shopping_mall_product_variant_option_values.findFirstOrThrow({
//     ...ShoppingMallProductVariantOptionValueTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallProductVariantOptionValueTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------