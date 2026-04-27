import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallProductImageTransformer } from "../transformers/ECommerceMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchECommerceMallAdministratorProductsProductIdImages(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  body: IECommerceMallProductImage.IReorder;
}): Promise<IECommerceMallProductImage> {
  // 1. Fetch product; 404 if not found — admin has oversight authority
  const product =
    await MyGlobal.prisma.e_commerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        category_id: true,
      },
    });
  // 2. Empty values array = no-op — return current thumbnail
  if (props.body.values.length === 0) {
    const thumbnail =
      await MyGlobal.prisma.e_commerce_mall_product_images.findFirstOrThrow({
        ...ECommerceMallProductImageTransformer.select(),
        where: { e_commerce_mall_product_id: props.productId },
        orderBy: { sort_order: "asc" as const },
      });
    return await ECommerceMallProductImageTransformer.transform(thumbnail);
  }
  // 3. Validate all image IDs belong to the specified product
  const existingImages =
    await MyGlobal.prisma.e_commerce_mall_product_images.findMany({
      where: {
        id: { in: props.body.values },
        e_commerce_mall_product_id: props.productId,
      },
      select: { id: true },
    });
  if (existingImages.length !== props.body.values.length) {
    throw new HttpException(
      "Some image IDs do not belong to the specified product",
      400,
    );
  }
  // 4. Two-phase sort_order update within transaction to avoid @@unique constraint
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Phase 1: Set all to negative offsets, clearing old sort_orders
    for (let i = 0; i < props.body.values.length; i++) {
      await tx.e_commerce_mall_product_images.update({
        where: { id: props.body.values[i] },
        data: {
          sort_order: -(i + 1),
          updated_at: new Date(),
        },
      });
    }
    // Phase 2: Set each to its final positive sort_order
    for (let i = 0; i < props.body.values.length; i++) {
      await tx.e_commerce_mall_product_images.update({
        where: { id: props.body.values[i] },
        data: {
          sort_order: i,
          updated_at: new Date(),
        },
      });
    }
  });
  // 5. Fetch all current images (post-reorder) for snapshot creation
  const allImages =
    await MyGlobal.prisma.e_commerce_mall_product_images.findMany({
      where: { e_commerce_mall_product_id: props.productId },
      select: { url: true, sort_order: true },
      orderBy: { sort_order: "asc" as const },
    });
  // 6. Create product snapshot preserving image ordering state
  await MyGlobal.prisma.e_commerce_mall_product_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      e_commerce_mall_product_id: props.productId,
      e_commerce_mall_category_id: product.category_id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      created_at: new Date(),
      snapshotImages: {
        create: allImages.map((img) => ({
          id: v4() as string & tags.Format<"uuid">,
          url: img.url,
          sort_order: img.sort_order,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })),
      },
    },
  });
  // 7. Return the updated thumbnail image (first image, lowest sort_order)
  const record =
    await MyGlobal.prisma.e_commerce_mall_product_images.findFirstOrThrow({
      ...ECommerceMallProductImageTransformer.select(),
      where: { e_commerce_mall_product_id: props.productId },
      orderBy: { sort_order: "asc" as const },
    });
  return await ECommerceMallProductImageTransformer.transform(record);
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
// import { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallAdministratorProductsProductIdImages(props: {
//   administrator: AdministratorPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IECommerceMallProductImage.IReorder;
// }): Promise<IECommerceMallProductImage> {
//   const record = await MyGlobal.prisma.e_commerce_mall_product_images.findFirstOrThrow({
//     ...ECommerceMallProductImageTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallProductImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------