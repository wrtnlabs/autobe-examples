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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminProductsProductIdVariantsVariantIdSnapshots(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductVariantSnapshot.ISummary> {
  // Validate product exists (admin can view any product)
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Validate variant exists and belongs to the product
  await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.variantId,
      product_id: props.productId,
    },
  });
  // Build filter conditions
  const search = props.body.search;
  const fromDate = props.body.fromDate;
  const toDate = props.body.toDate;
  const whereInput: Prisma.ecommerce_mall_product_variant_snapshotsWhereInput =
    {
      product_id: props.productId,
      product_variant_id: props.variantId,
      ...(search !== undefined && { sku_code: { contains: search } }),
      ...(fromDate !== undefined && { created_at: { gte: fromDate } }),
      ...(toDate !== undefined && { created_at: { lt: toDate } }),
    } satisfies Prisma.ecommerce_mall_product_variant_snapshotsWhereInput;
  // Fetch paginated results
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        sku_code: true,
        options: true,
        price: true,
        stock_quantity: true,
        status: true,
        created_at: true,
      },
    });
  // Fetch total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.count({
      where: whereInput,
    });
  // Transform and return paginated response
  const transformedData = await ArrayUtil.asyncMap(data, async (record) => {
    return {
      id: record.id,
      sku_code: record.sku_code,
      options: record.options,
      price: Number(record.price),
      stock_quantity: record.stock_quantity,
      status: record.status,
      created_at: toISOStringSafe(record.created_at),
    };
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
