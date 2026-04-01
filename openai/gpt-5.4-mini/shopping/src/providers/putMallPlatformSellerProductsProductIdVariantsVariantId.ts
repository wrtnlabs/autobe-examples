import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
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

export async function putMallPlatformSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariant.IUpdate;
}): Promise<IMallPlatformProductVariant> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        mall_platform_product_id: true,
        sku_code: true,
        option_values: true,
        price_override: true,
        is_active: true,
        deleted_at: true,
      },
    });
  if (variant.mall_platform_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  if (props.body.skuCode !== undefined) {
    const duplicated =
      await MyGlobal.prisma.mall_platform_product_variants.findFirst({
        where: {
          sku_code: props.body.skuCode,
          id: { not: props.variantId },
        },
        select: {
          id: true,
        },
      });
    if (duplicated !== null) {
      throw new HttpException("SKU code already exists", 400);
    }
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.mall_platform_product_variant_snapshots.create({
      data: {
        id: v4(),
        mall_platform_product_variant_id: variant.id,
        mall_platform_product_id: variant.mall_platform_product_id,
        sku_code: variant.sku_code,
        option_summary: variant.option_values,
        price_override: variant.price_override,
        snapshot_reason: "update",
        created_at: new Date(),
      },
    }),
    MyGlobal.prisma.mall_platform_product_variants.update({
      where: { id: props.variantId },
      data: {
        ...(props.body.skuCode !== undefined
          ? { sku_code: props.body.skuCode }
          : {}),
        ...(props.body.optionValues !== undefined
          ? { option_values: props.body.optionValues }
          : {}),
        ...(props.body.priceOverride !== undefined
          ? { price_override: props.body.priceOverride }
          : {}),
        ...(props.body.isActive !== undefined
          ? { is_active: props.body.isActive }
          : {}),
        updated_at: new Date(),
      },
    }),
  ]);
  const updated =
    await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        is_active: true,
        deleted_at: true,
      },
    });
  return {
    status:
      updated.deleted_at === null && updated.is_active
        ? "available"
        : "unavailable",
  };
}
