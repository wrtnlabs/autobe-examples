import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putEcommerceSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProduct.IUpdate;
}): Promise<IEcommerceProduct> {
  // 1. Ownership verification - product must exist and belong to seller
  const currentProduct =
    await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        ecommerce_seller_id: true,
        name: true,
        description: true,
        base_price: true,
        ecommerce_category_id: true,
      },
    });
  if (currentProduct.ecommerce_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Category validation if category_id provided
  if (props.body.category_id !== undefined) {
    await MyGlobal.prisma.ecommerce_categories.findUniqueOrThrow({
      where: { id: props.body.category_id },
    });
  }
  // 3. Create snapshot before update - using ISO string for timestamp
  const now = toISOStringSafe(new Date());
  // Fixed: Use correct field names based on database schema
  await MyGlobal.prisma.ecommerce_product_snapshots.create({
    data: {
      id: v4(),
      seller_id: currentProduct.ecommerce_seller_id,
      ecommerce_product_id: props.productId,
      category_id: currentProduct.ecommerce_category_id,
      name: currentProduct.name,
      description: currentProduct.description,
      base_price: currentProduct.base_price,
      created_at: now,
    },
  });
  // 4. Prepare update data with partial field handling
  const updateData: Prisma.ecommerce_productsUpdateInput = {};
  if (props.body.name !== undefined) updateData.name = props.body.name;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  if (props.body.base_price !== undefined)
    updateData.base_price = props.body.base_price;
  if (props.body.category_id !== undefined) {
    updateData.category = { connect: { id: props.body.category_id } };
  }
  updateData.updated_at = toISOStringSafe(new Date());
  // Check if any fields actually changed
  const hasUpdates =
    props.body.name !== undefined ||
    props.body.description !== undefined ||
    props.body.base_price !== undefined ||
    props.body.category_id !== undefined;
  if (hasUpdates) {
    await MyGlobal.prisma.ecommerce_products.update({
      where: { id: props.productId },
      data: updateData,
    });
  }
  // 5. Retrieve updated product and transform response using loaded transformer
  const updated = await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
    ...EcommerceProductTransformer.select(),
  });
  return await EcommerceProductTransformer.transform(updated);
}
