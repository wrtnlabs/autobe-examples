import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductTransformer } from "../transformers/EcommerceMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProduct.IUpdate;
}): Promise<IEcommerceMallProduct> {
  // 1. Find product and verify ownership
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
    },
    select: {
      id: true,
      seller_id: true,
      status: true,
      deleted_at: true,
      name: true,
      description: true,
      base_price: true,
      category_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  // 2. Check product status - cannot update deleted or suspended products
  if (product.deleted_at !== null) {
    throw new HttpException("Cannot update deleted product", 403);
  }
  if (product.status === "deleted") {
    throw new HttpException("Cannot update deleted product", 403);
  }
  if (product.status === "suspended") {
    throw new HttpException("Cannot update suspended product", 403);
  }
  // 3. Verify seller approval status
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { id: props.seller.id },
    select: { approval_status: true, account_status: true },
  });
  if (seller === null) {
    throw new HttpException("Seller not found", 403);
  }
  if (seller.approval_status !== "approved") {
    throw new HttpException("Seller account not approved", 403);
  }
  if (seller.account_status !== "active") {
    throw new HttpException("Seller account not active", 403);
  }
  // 4. Validate name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const duplicate = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
      where: {
        id: { not: props.productId },
        seller_id: props.seller.id,
        name: props.body.name,
        status: "active",
        deleted_at: null,
      },
    });
    if (duplicate !== null) {
      throw new HttpException(
        "Product name already exists in your catalog",
        409,
      );
    }
  }
  // 5. Validate category exists if category_id is being updated
  if (props.body.category_id !== undefined) {
    const category = await MyGlobal.prisma.ecommerce_mall_categories.findUnique(
      {
        where: { id: props.body.category_id },
      },
    );
    if (category === null) {
      throw new HttpException("Category not found", 422);
    }
  }
  // 6. Prepare snapshot data with current values
  const snapshotData = {
    id: product.id,
    seller_id: product.seller_id,
    category_id: product.category_id,
    name: product.name,
    description: product.description,
    base_price: product.base_price,
    status: product.status,
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
    deleted_at: product.deleted_at ? toISOStringSafe(product.deleted_at) : null,
  };
  // 7. Update product
  const updatedProduct = await MyGlobal.prisma.ecommerce_mall_products.update({
    where: { id: props.productId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.base_price !== undefined && {
        base_price: props.body.base_price,
      }),
      ...(props.body.category_id !== undefined && {
        category_id: props.body.category_id,
      }),
      updated_at: new Date(),
    },
  });
  // 8. Create snapshot with previous and current values
  const currentSnapshotData = {
    id: updatedProduct.id,
    seller_id: updatedProduct.seller_id,
    category_id: updatedProduct.category_id,
    name: updatedProduct.name,
    description: updatedProduct.description,
    base_price: updatedProduct.base_price,
    status: updatedProduct.status,
    created_at: toISOStringSafe(updatedProduct.created_at),
    updated_at: toISOStringSafe(updatedProduct.updated_at),
    deleted_at: updatedProduct.deleted_at
      ? toISOStringSafe(updatedProduct.deleted_at)
      : null,
  };
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_products_id: props.productId,
      ecommerce_mall_sellers_id: props.seller.id,
      previous_values: JSON.stringify(snapshotData),
      current_values: JSON.stringify(currentSnapshotData),
      created_at: new Date(),
    },
  });
  // 9. Return updated product with full details using transformer
  const fullProduct =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...EcommerceMallProductTransformer.select(),
    });
  return await EcommerceMallProductTransformer.transform(fullProduct);
}
