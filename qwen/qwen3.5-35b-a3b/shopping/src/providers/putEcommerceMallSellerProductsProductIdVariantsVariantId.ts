import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantTransformer } from "../transformers/EcommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IUpdate;
}): Promise<IEcommerceMallProductVariant> {
  const existingProduct =
    await MyGlobal.prisma.ecommerce_mall_products.findFirst({
      where: {
        id: props.productId,
        seller: {
          id: props.seller.id,
        },
        deleted_at: null,
      },
    });
  if (existingProduct === null) {
    throw new HttpException("Product not found", 404);
  }
  const existingVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
    });
  if (existingVariant === null) {
    throw new HttpException("Variant not found", 404);
  }
  if (props.body.sku !== undefined) {
    const duplicateVariant =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
        where: {
          sku: props.body.sku,
          id: {
            not: props.variantId,
          },
          deleted_at: null,
        },
      });
    if (duplicateVariant !== null) {
      throw new HttpException("SKU must be unique", 400);
    }
  }
  if (props.body.base_price !== undefined) {
    if (props.body.base_price < 0) {
      throw new HttpException("Base price must be non-negative", 400);
    }
  }
  if (props.body.sale_price !== undefined) {
    if (props.body.sale_price !== null && props.body.sale_price < 0) {
      throw new HttpException("Sale price must be non-negative", 400);
    }
    if (props.body.base_price !== undefined && props.body.sale_price !== null) {
      if (props.body.sale_price > props.body.base_price) {
        throw new HttpException("Sale price cannot exceed base price", 400);
      }
    }
  }
  if (props.body.status !== undefined) {
    if (!["active", "inactive", "discontinued"].includes(props.body.status)) {
      throw new HttpException("Invalid status value", 400);
    }
  }
  const snapshotData = {
    id: v4(),
    sku_code: existingVariant.sku,
    options: existingVariant.options,
    price: existingVariant.base_price,
    stock_quantity: existingVariant.stock_quantity,
    status: "active" as const,
    product: {
      connect: {
        id: existingVariant.product_id,
      },
    },
    productVariant: {
      connect: {
        id: props.variantId,
      },
    },
    created_at: toISOStringSafe(new Date()),
  } satisfies Prisma.ecommerce_mall_product_variant_snapshotsCreateInput;
  await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.create({
    data: snapshotData,
  });
  const updateData: Prisma.ecommerce_mall_product_variantsUpdateInput = {};
  if (props.body.sku !== undefined) {
    updateData.sku = props.body.sku;
  }
  if (props.body.options !== undefined) {
    updateData.options = JSON.stringify(props.body.options);
  }
  if (props.body.base_price !== undefined) {
    updateData.base_price = props.body.base_price;
  }
  if (props.body.sale_price !== undefined) {
    updateData.sale_price = props.body.sale_price;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.sort_order !== undefined) {
    updateData.sort_order = props.body.sort_order;
  }
  if (props.body.is_default !== undefined) {
    updateData.is_default = props.body.is_default;
  }
  updateData.updated_at = toISOStringSafe(new Date());
  const updatedVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.update({
      where: {
        id: props.variantId,
      },
      data: updateData,
      ...EcommerceMallProductVariantTransformer.select(),
    });
  return await EcommerceMallProductVariantTransformer.transform(updatedVariant);
}
