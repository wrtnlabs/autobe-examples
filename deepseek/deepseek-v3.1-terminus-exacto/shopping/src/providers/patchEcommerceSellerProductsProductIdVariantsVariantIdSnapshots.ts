import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceVariantSnapshotAtSummaryTransformer } from "../transformers/EcommerceVariantSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerProductsProductIdVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceVariantSnapshot.IRequest;
}): Promise<IPageIEcommerceVariantSnapshot.ISummary> {
  // Validate variant exists and belongs to seller's product
  const variant = await MyGlobal.prisma.ecommerce_product_variants.findFirst({
    where: {
      id: props.variantId,
      product: {
        id: props.productId,
        ecommerce_seller_id: props.seller.id,
        deleted_at: null,
      },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!variant) {
    throw new HttpException("Variant not found or access denied", 404);
  }
  // Build WHERE clause with proper date handling
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    ecommerce_product_variant_id: props.variantId,
    ...(props.body.customer_id && {
      ecommerce_customer_id: props.body.customer_id,
    }),
    ...(props.body.seller_id && { ecommerce_seller_id: props.body.seller_id }),
    ...(props.body.administrator_id && {
      ecommerce_administrator_id: props.body.administrator_id,
    }),
    ...(props.body.operation_type && {
      operation_type: props.body.operation_type,
    }),
    ...(props.body.start_date && {
      created_at: { gte: new Date(props.body.start_date) },
    }),
    ...(props.body.end_date && {
      created_at: { lte: new Date(props.body.end_date) },
    }),
    ...(props.body.search && {
      change_reason: { contains: props.body.search },
    }),
  } satisfies Prisma.ecommerce_variant_snapshotsWhereInput;
  // Query snapshots with pagination
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_variant_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceVariantSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_variant_snapshots.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceVariantSnapshotAtSummaryTransformer.transform,
  );
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
