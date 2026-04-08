import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantOptionTransformer } from "../transformers/EcommerceMallProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallProductsProductIdVariantsProductVariantIdOptionsProductVariantOptionId(props: {
  productId: string;
  productVariantId: string;
  productVariantOptionId: string;
}): Promise<IEcommerceMallProductVariantOption> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUniqueOrThrow(
      {
        ...EcommerceMallProductVariantOptionTransformer.select(),
        where: { id: props.productVariantOptionId },
      },
    );
  // Path consistency check: verify the option belongs to the specified variant
  if (record.productVariant.id !== props.productVariantId) {
    throw new HttpException(
      "Option does not belong to the specified variant",
      404,
    );
  }
  return await EcommerceMallProductVariantOptionTransformer.transform(record);
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
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallProductsProductIdVariantsProductVariantIdOptionsProductVariantOptionId(props: {
//   productId: string;
//   productVariantId: string;
//   productVariantOptionId: string;
// }): Promise<IEcommerceMallProductVariantOption> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_variant_options.findFirstOrThrow({
//     ...EcommerceMallProductVariantOptionTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductVariantOptionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------