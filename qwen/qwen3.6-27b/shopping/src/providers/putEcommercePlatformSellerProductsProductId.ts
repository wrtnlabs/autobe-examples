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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformProductTransformer } from "../transformers/EcommercePlatformProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommercePlatformSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommercePlatformProduct.IUpdate;
}): Promise<IEcommercePlatformProduct> {
  const product =
    await MyGlobal.prisma.ecommerce_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        name: true,
        description: true,
        ecommerce_platform_category_id: true,
        ecommerce_platform_seller_profile_id: true,
      },
    });
  if (product.ecommerce_platform_seller_profile_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.category_id !== undefined) {
    await MyGlobal.prisma.ecommerce_platform_categories.findUniqueOrThrow({
      where: { id: props.body.category_id, deleted_at: null },
      select: { id: true },
    });
  }
  await MyGlobal.prisma.ecommerce_platform_snapshots.create({
    data: {
      id: v4(),
      entity_type: "product",
      created_at: new Date(),
      snapshotProduct: {
        create: {
          id: v4(),
          ecommerce_platform_product_id: props.productId,
          name_previous: product.name,
          name_current: props.body.name ?? product.name,
          description_previous: product.description,
          description_current: props.body.description ?? product.description,
          category_id_current:
            props.body.category_id ?? product.ecommerce_platform_category_id,
        },
      },
    },
  });
  await MyGlobal.prisma.ecommerce_platform_products.update({
    where: { id: props.productId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.category_id !== undefined && {
        ecommerce_platform_category_id: props.body.category_id,
      }),
      ...(props.body.base_price !== undefined && {
        base_price: props.body.base_price,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.ecommerce_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...EcommercePlatformProductTransformer.select(),
    });
  return await EcommercePlatformProductTransformer.transform(updated);
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
// export async function putEcommercePlatformSellerProductsProductId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformProduct.IUpdate;
// }): Promise<IEcommercePlatformProduct> {
//   await MyGlobal.prisma.ecommerce_platform_products.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_platform_products.findUniqueOrThrow({
//     where: { ... },
//     ...EcommercePlatformProductTransformer.select(),
//   });
//   return await EcommercePlatformProductTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------