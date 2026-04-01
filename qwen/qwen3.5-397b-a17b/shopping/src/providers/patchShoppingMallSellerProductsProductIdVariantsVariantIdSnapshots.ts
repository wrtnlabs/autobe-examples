import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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

export async function patchShoppingMallSellerProductsProductIdVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const sortOrder = props.body.sort?.order ?? "DESC";
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      400,
    );
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      seller_id: true,
      base_price: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variantPrices =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { shopping_mall_product_id: props.productId },
      select: {
        price_override: true,
      },
    });
  const basePrice = product.base_price ?? 0;
  const priceOverrides = variantPrices
    .map((v) => v.price_override)
    .filter((p): p is number => p !== null);
  const minPrice =
    priceOverrides.length > 0 ? Math.min(...priceOverrides) : basePrice;
  const maxPrice =
    priceOverrides.length > 0 ? Math.max(...priceOverrides) : basePrice;
  const orderByInput =
    sortOrder === "ASC"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  const whereInput = {
    shopping_mall_product_variant_id: props.variantId,
  } satisfies Prisma.shopping_mall_product_variant_snapshotsWhereInput;
  const snapshots =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        sku_code: true,
        price_override: true,
        created_at: true,
        optionValues: {
          select: {
            id: true,
            optionValue: {
              select: {
                id: true,
                name: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                optionDefinition: {
                  select: {
                    id: true,
                    name: true,
                    created_at: true,
                    shopping_mall_product_id: true,
                  },
                },
              },
            },
          },
        } satisfies Prisma.shopping_mall_product_variant_snapshot_optionsFindManyArgs,
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.count({
      where: whereInput,
    });
  const data = snapshots.map((snapshot) => {
    const optionValues = snapshot.optionValues.map((ov) => {
      const optionValue = ov.optionValue;
      const optionDefinition = optionValue.optionDefinition;
      return {
        id: optionValue.id,
        name: optionValue.name,
        optionDefinition: {
          id: optionDefinition.id,
          name: optionDefinition.name,
          created_at: toISOStringSafe(optionDefinition.created_at),
          product: {
            min: minPrice,
            max: maxPrice,
          } satisfies IShoppingMallProduct.ISummary,
        } satisfies IShoppingMallProductOptionDefinition.ISummary,
        created_at: toISOStringSafe(optionValue.created_at),
        updated_at: toISOStringSafe(optionValue.updated_at),
        deleted_at:
          optionValue.deleted_at === null
            ? null
            : toISOStringSafe(optionValue.deleted_at),
      } satisfies IShoppingMallProductOptionValue.ISummary;
    });
    return {
      id: snapshot.id,
      sku_code: snapshot.sku_code,
      price_override: snapshot.price_override,
      created_at: toISOStringSafe(snapshot.created_at),
      optionValues: optionValues,
    } satisfies IShoppingMallProductVariantSnapshot.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
