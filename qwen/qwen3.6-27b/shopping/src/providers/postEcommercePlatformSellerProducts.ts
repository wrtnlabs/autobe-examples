import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
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
import { EcommercePlatformProductCollector } from "../collectors/EcommercePlatformProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformProductTransformer } from "../transformers/EcommercePlatformProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformSellerProducts(props: {
  seller: SellerPayload;
  body: IEcommercePlatformProduct.ICreate;
}): Promise<IEcommercePlatformProduct> {
  const sellerProfile =
    await MyGlobal.prisma.ecommerce_platform_seller_profiles.findUniqueOrThrow({
      where: { seller_id: props.seller.id },
    });
  await MyGlobal.prisma.ecommerce_platform_categories.findUniqueOrThrow({
    where: {
      id: props.body.category_id,
      deleted_at: null,
    },
  });
  const ecommercePlatformSellerProfiles = {
    id: sellerProfile.id,
  } satisfies IEntity;
  const record = await MyGlobal.prisma.ecommerce_platform_products.create({
    data: await EcommercePlatformProductCollector.collect({
      body: props.body,
      ecommercePlatformSellerProfiles,
    }),
    ...EcommercePlatformProductTransformer.select(),
  });
  return await EcommercePlatformProductTransformer.transform(record);
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
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
// import { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformSellerProducts(props: {
//   seller: SellerPayload;
//   body: IEcommercePlatformProduct.ICreate;
// }): Promise<IEcommercePlatformProduct> {
//   const record = await MyGlobal.prisma.ecommerce_platform_products.create({
//     data: await EcommercePlatformProductCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommercePlatformProductTransformer.select(),
//   });
//   return await EcommercePlatformProductTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------