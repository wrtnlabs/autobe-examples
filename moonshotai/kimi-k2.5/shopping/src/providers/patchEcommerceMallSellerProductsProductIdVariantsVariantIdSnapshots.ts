import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
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

export async function patchEcommerceMallSellerProductsProductIdVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductVariantSnapshot.ISummary> {
  // Verify product exists and seller owns it
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found or access denied", 404);
  }
  // Verify variant exists and belongs to the product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product_id: props.productId,
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with time filters
  const baseWhere: Prisma.ecommerce_mall_product_variant_snapshotsWhereInput = {
    product_variant_id: props.variantId,
  };
  const where: Prisma.ecommerce_mall_product_variant_snapshotsWhereInput = {
    ...baseWhere,
    ...((props.body.createdAtFrom !== undefined &&
      props.body.createdAtFrom !== null) ||
    (props.body.createdAtTo !== undefined && props.body.createdAtTo !== null)
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined &&
            props.body.createdAtFrom !== null
              ? { gte: new Date(props.body.createdAtFrom) }
              : {}),
            ...(props.body.createdAtTo !== undefined &&
            props.body.createdAtTo !== null
              ? { lte: new Date(props.body.createdAtTo) }
              : {}),
          },
        }
      : {}),
  };
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        product_variant_id: true,
        sku_code: true,
        price: true,
        created_at: true,
        optionValues: {
          select: {
            option_name: true,
            option_value: true,
          },
        },
      } satisfies Prisma.ecommerce_mall_product_variant_snapshotsFindManyArgs["select"],
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.count({
      where,
    });
  // Transform snapshots to summary format
  const data = snapshots.map((snapshot) => {
    // Convert optionValues array to dictionary
    const optionValues: {
      [key: string]: string;
    } = {};
    for (const optionValue of snapshot.optionValues) {
      optionValues[optionValue.option_name] = optionValue.option_value;
    }
    return {
      id: snapshot.id,
      variantId: snapshot.product_variant_id,
      skuCode: snapshot.sku_code,
      price: snapshot.price,
      optionValues,
      createdAt: snapshot.created_at.toISOString(),
    } satisfies IEcommerceMallProductVariantSnapshot.ISummary;
  });
  return {
    data,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
