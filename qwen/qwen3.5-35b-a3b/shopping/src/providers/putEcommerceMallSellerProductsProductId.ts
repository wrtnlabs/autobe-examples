import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.base_price !== undefined && props.body.base_price <= 0) {
    throw new HttpException("Base price must be positive", 400);
  }
  if (props.body.category_id !== undefined) {
    const category = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: {
        id: props.body.category_id,
        deleted_at: null,
      },
    });
    if (!category) {
      throw new HttpException("Category not found", 400);
    }
  }
  const oldValues = {
    name: product.name,
    description: product.description,
    base_price: product.base_price,
    category_id: product.category_id,
    is_active: product.is_active,
  };
  const now = new Date().toISOString();
  const updateData: Prisma.ecommerce_mall_productsUpdateInput = {
    updated_at: now,
  };
  if (props.body.name !== undefined) updateData.name = props.body.name;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  if (props.body.base_price !== undefined)
    updateData.base_price = props.body.base_price;
  if (props.body.category_id !== undefined)
    updateData.category = { connect: { id: props.body.category_id } };
  if (props.body.is_active !== undefined)
    updateData.is_active = props.body.is_active;
  await MyGlobal.prisma.ecommerce_mall_products.update({
    where: { id: props.productId },
    data: updateData,
  });
  const changedFields: string[] = [];
  if (props.body.name !== undefined) changedFields.push("name");
  if (props.body.description !== undefined) changedFields.push("description");
  if (props.body.base_price !== undefined) changedFields.push("base_price");
  if (props.body.category_id !== undefined) changedFields.push("category_id");
  if (props.body.is_active !== undefined) changedFields.push("is_active");
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: v4(),
      product_id: props.productId,
      category_id: props.body.category_id ?? product.category_id,
      seller_id: props.seller.id,
      name: props.body.name ?? product.name,
      description: props.body.description ?? product.description,
      base_price: props.body.base_price ?? product.base_price,
      is_active: props.body.is_active ?? product.is_active,
      created_at: now,
    },
  });
  await MyGlobal.prisma.ecommerce_mall_snapshot_audits.create({
    data: {
      id: v4(),
      record_type: "ecommerce_mall_product",
      record_id: props.productId,
      changes: JSON.stringify(changedFields),
      old_values: JSON.stringify(oldValues),
      new_values: JSON.stringify({
        name: props.body.name ?? product.name,
        description: props.body.description ?? product.description,
        base_price: props.body.base_price ?? product.base_price,
        category_id: props.body.category_id ?? product.category_id,
        is_active: props.body.is_active ?? product.is_active,
      }),
      changed_at: now,
      changed_by: props.seller.id,
      created_at: now,
      updated_at: now,
    },
  });
  const result =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...EcommerceMallProductTransformer.select(),
    });
  return await EcommerceMallProductTransformer.transform(result);
}
