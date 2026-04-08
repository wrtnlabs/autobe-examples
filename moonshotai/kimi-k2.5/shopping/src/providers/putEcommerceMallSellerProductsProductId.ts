import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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
  // Check seller approval status - reject if pending or rejected
  const sellerRecord =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.seller.id },
      select: { id: true, approval_status: true },
    });
  if (
    sellerRecord.approval_status === "pending" ||
    sellerRecord.approval_status === "rejected"
  ) {
    throw new HttpException("Seller registration not approved", 403);
  }
  // Find product and verify ownership - product must exist and belong to seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      category_id: true,
      base_price: true,
      created_at: true,
      images: {
        select: { id: true, image_url: true, display_order: true },
      },
      variants: {
        select: {
          id: true,
          sku_code: true,
          price: true,
          created_at: true,
        },
      },
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  // Fetch variant options separately by querying the options table directly
  const variantOptions =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findMany({
      where: {
        productVariant: {
          product_id: props.productId,
          deleted_at: null,
        },
      },
      select: {
        product_variant_id: true,
        option_name: true,
        option_value: true,
      },
    });
  // Group options by product_variant_id
  const optionsByVariant = new Map<
    string,
    {
      option_name: string;
      option_value: string;
    }[]
  >();
  for (const opt of variantOptions) {
    const existing = optionsByVariant.get(opt.product_variant_id) || [];
    existing.push({
      option_name: opt.option_name,
      option_value: opt.option_value,
    });
    optionsByVariant.set(opt.product_variant_id, existing);
  }
  // Validate new category exists if categoryId is being changed
  if (
    props.body.categoryId !== undefined &&
    props.body.categoryId !== product.category_id
  ) {
    const category = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: { id: props.body.categoryId, deleted_at: null },
      select: { id: true },
    });
    if (category === null) {
      throw new HttpException("Category not found", 404);
    }
  }
  // Create product snapshot before making changes
  const snapshotId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: snapshotId,
      product_id: product.id,
      name: product.name,
      description: product.description,
      category_id: product.category_id,
      base_price: product.base_price,
      created_at: product.created_at,
      images: {
        create: product.images.map(
          (img: { image_url: string; display_order: number }) => ({
            id: v4() as string & tags.Format<"uuid">,
            url: img.image_url,
            display_order: img.display_order,
            created_at: new Date(),
          }),
        ),
      },
    },
  });
  // Create variant snapshots with their option values
  for (const variant of product.variants) {
    const variantSnapshotId: string & tags.Format<"uuid"> = v4();
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.create({
      data: {
        id: variantSnapshotId,
        sku_code: variant.sku_code,
        price: variant.price ?? 0,
        created_at: variant.created_at,
        productVariant: { connect: { id: variant.id } },
      },
    });
    // Create option value snapshots for this variant
    const options = optionsByVariant.get(variant.id) || [];
    for (const option of options) {
      await MyGlobal.prisma.ecommerce_mall_product_variant_snapshot_option_values.create(
        {
          data: {
            id: v4() as string & tags.Format<"uuid">,
            ecommerce_mall_product_variant_snapshot_id: variantSnapshotId,
            option_name: option.option_name,
            option_value: option.option_value,
            created_at: new Date(),
          },
        },
      );
    }
  }
  // Build update data from request body - only include fields that are provided
  const updateData: Prisma.ecommerce_mall_productsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.categoryId !== undefined) {
    updateData.category = { connect: { id: props.body.categoryId } };
  }
  if (props.body.basePrice !== undefined) {
    updateData.base_price = props.body.basePrice;
  }
  // Execute the product update
  await MyGlobal.prisma.ecommerce_mall_products.update({
    where: { id: props.productId },
    data: updateData,
  });
  // Fetch and return the updated product using transformer
  const updated =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...EcommerceMallProductTransformer.select(),
    });
  return await EcommerceMallProductTransformer.transform(updated);
}
