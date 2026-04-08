import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformProductVariantTransformer } from "../transformers/MallPlatformProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformProductsProductIdVariantsVariantId(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformProductVariant> {
  const record =
    await MyGlobal.prisma.mall_platform_product_variants.findFirstOrThrow({
      where: {
        id: props.variantId,
        mall_platform_product_id: props.productId,
      },
      ...MallPlatformProductVariantTransformer.select(),
    });
  return await MallPlatformProductVariantTransformer.transform(record);
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
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformProductsProductIdVariantsVariantId(props: {
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformProductVariant> {
//   const record = await MyGlobal.prisma.mall_platform_product_variants.findFirstOrThrow({
//     ...MallPlatformProductVariantTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformProductVariantTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------