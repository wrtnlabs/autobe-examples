import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductTransformer } from "../transformers/EcommerceProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSellerProductsProductId(props: {
  seller: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "seller";
  };
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProduct.IUpdate;
}): Promise<IEcommerceProduct> {
  // Verify product exists and is not soft-deleted
  const product = await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: {
      id: true,
      seller_id: true,
      name: true,
      description: true,
      category_id: true,
      base_price: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Validate seller ownership
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate name is non-empty if provided
  if (props.body.name !== undefined && props.body.name.trim().length === 0) {
    throw new HttpException("Product name cannot be empty", 400);
  }
  // Validate description is non-empty if provided
  if (
    props.body.description !== undefined &&
    props.body.description.trim().length === 0
  ) {
    throw new HttpException("Product description cannot be empty", 400);
  }
  // Validate base_price is positive if provided
  if (props.body.base_price !== undefined && props.body.base_price <= 0) {
    throw new HttpException("Base price must be positive", 400);
  }
  // Validate category exists if provided
  if (props.body.category_id !== undefined) {
    await MyGlobal.prisma.ecommerce_categories.findFirstOrThrow({
      where: { id: props.body.category_id, deleted_at: null },
    });
  }
  // Build update data with conditional spreads for optional fields
  const updateData = {
    updated_at: new Date(),
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.category_id !== undefined && {
      category_id: props.body.category_id,
    }),
    ...(props.body.base_price !== undefined && {
      base_price: props.body.base_price,
    }),
  } satisfies Prisma.ecommerce_productsUpdateInput;
  // Update the product
  await MyGlobal.prisma.ecommerce_products.update({
    where: { id: props.productId },
    data: updateData,
  });
  // Create snapshot to preserve previous state
  const snapshotId = v4();
  await MyGlobal.prisma.ecommerce_product_snapshots.create({
    data: {
      id: snapshotId,
      ecommerce_product_id: props.productId,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      category_id: product.category_id,
      created_at: new Date(),
    },
  });
  // Fetch updated product with all relationships
  const updated = await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
    ...EcommerceProductTransformer.select(),
  });
  return await EcommerceProductTransformer.transform(updated);
}
