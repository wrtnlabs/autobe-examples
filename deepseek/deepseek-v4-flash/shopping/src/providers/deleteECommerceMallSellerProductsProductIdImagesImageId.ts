import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteECommerceMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find product and verify seller ownership
  const product = await MyGlobal.prisma.e_commerce_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
      seller_id: true,
      name: true,
      description: true,
      base_price: true,
      category_id: true,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify seller is approved
  const seller = await MyGlobal.prisma.e_commerce_mall_sellers.findFirst({
    where: {
      id: props.seller.id,
      deleted_at: null,
    },
    select: {
      approval_status: true,
    },
  });
  if (seller === null || seller.approval_status !== "approved") {
    throw new HttpException(
      "Administrator approval is required before selling.",
      403,
    );
  }
  // Step 3: Verify image exists and belongs to the product
  const image = await MyGlobal.prisma.e_commerce_mall_product_images.findFirst({
    where: {
      id: props.imageId,
      e_commerce_mall_product_id: props.productId,
    },
    select: {
      id: true,
      url: true,
      sort_order: true,
    },
  });
  if (image === null) {
    throw new HttpException("Image not found", 404);
  }
  // Step 4: Fetch ALL current images for snapshot preservation
  const allImages =
    await MyGlobal.prisma.e_commerce_mall_product_images.findMany({
      where: {
        e_commerce_mall_product_id: props.productId,
      },
      select: {
        url: true,
        sort_order: true,
      },
      orderBy: {
        sort_order: "asc",
      },
    });
  // Step 5: Create product snapshot capturing pre-deletion state
  const snapshotId = v4();
  const now = new Date().toISOString();
  await MyGlobal.prisma.e_commerce_mall_product_snapshots.create({
    data: {
      id: snapshotId,
      product: { connect: { id: props.productId } },
      ...(product.category_id !== null
        ? { category: { connect: { id: product.category_id } } }
        : {}),
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      created_at: now,
    },
  });
  // Step 6: Create snapshot image records for ALL current images
  if (allImages.length > 0) {
    await MyGlobal.prisma.e_commerce_mall_product_snapshot_images.createMany({
      data: allImages.map((img) => ({
        id: v4(),
        e_commerce_mall_product_snapshot_id: snapshotId,
        url: img.url,
        sort_order: img.sort_order,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })),
    });
  }
  // Step 7: Hard-delete the image
  await MyGlobal.prisma.e_commerce_mall_product_images.delete({
    where: { id: props.imageId },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteECommerceMallSellerProductsProductIdImagesImageId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------