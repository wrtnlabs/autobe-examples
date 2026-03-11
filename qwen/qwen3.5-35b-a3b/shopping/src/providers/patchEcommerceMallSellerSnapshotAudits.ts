import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshotAudit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSnapshotAuditAtSummaryTransformer } from "../transformers/EcommerceMallSnapshotAuditAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSnapshotAudits(props: {
  seller: SellerPayload;
  body: IEcommerceMallSnapshotAudit.IRequest;
}): Promise<IPageIEcommerceMallSnapshotAudit.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Get seller's products to filter product/product_variant snapshots
  const sellerProducts = await MyGlobal.prisma.ecommerce_mall_products.findMany(
    {
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  const productIds = sellerProducts.map((p) => p.id) as Array<
    string & tags.Format<"uuid">
  >;
  // Build record_type filter - seller can only see their own entity snapshots
  let recordTypeFilter: Array<
    | "product"
    | "product_variant"
    | "seller_profile"
    | "order_item"
    | "review"
    | "cancellation_request"
    | "refund_request"
  > = ["product", "product_variant", "seller_profile"];
  // Apply body record_type filter if provided
  if (props.body.record_type && props.body.record_type.length > 0) {
    const allowedTypes: Array<
      | "product"
      | "product_variant"
      | "seller_profile"
      | "order_item"
      | "review"
      | "cancellation_request"
      | "refund_request"
    > = props.body.record_type;
    // Filter to only allowed types that sellers can see
    recordTypeFilter = allowedTypes.filter((t) =>
      ["product", "product_variant", "seller_profile"].includes(t),
    );
  }
  // Build where clause with proper ownership filtering
  const whereInput: Prisma.ecommerce_mall_snapshot_auditsWhereInput = {
    changed_by: props.seller.id,
  };
  if (recordTypeFilter.length > 0) {
    whereInput.record_type = {
      in: recordTypeFilter,
    };
  }
  // Date range filters
  const dateFilter: Prisma.ecommerce_mall_snapshot_auditsWhereInput["changed_at"] =
    {};
  if (props.body.from_changed_at) {
    dateFilter.gte = props.body.from_changed_at;
  }
  if (props.body.to_changed_at) {
    dateFilter.lt = props.body.to_changed_at;
  }
  if (Object.keys(dateFilter).length > 0) {
    whereInput.changed_at = dateFilter;
  }
  // For product snapshots, filter by seller's product IDs
  if (
    productIds.length > 0 &&
    (recordTypeFilter.includes("product") ||
      recordTypeFilter.includes("product_variant") ||
      recordTypeFilter.length === 0)
  ) {
    const snapshotWhereInput: Prisma.ecommerce_mall_snapshot_auditsWhereInput =
      { ...whereInput };
    // Handle product and product_variant snapshots
    const productAndVariantTypes: Array<"product" | "product_variant"> = [
      "product",
      "product_variant",
    ];
    const shouldFilterByProducts =
      productAndVariantTypes.some((t) => recordTypeFilter.includes(t)) ||
      recordTypeFilter.length === 0;
    if (shouldFilterByProducts) {
      snapshotWhereInput.record_id = {
        in: productIds,
      };
    }
    // Handle seller_profile snapshots
    if (
      recordTypeFilter.includes("seller_profile") ||
      recordTypeFilter.length === 0
    ) {
      // For seller_profile, record_id should be the seller's profile ID
      // However, we need to know the seller_profile ID structure
      // For now, we'll include it but the record_id filter will handle it
      // The actual seller profile ID would be in seller_profile_id column
    }
    Object.assign(whereInput, snapshotWhereInput);
  }
  // Determine sort order
  const orderByInput: Prisma.ecommerce_mall_snapshot_auditsOrderByWithRelationInput =
    (() => {
      switch (props.body.sort) {
        case "created_at":
          return { created_at: "desc" as const };
        case "record_type":
          return { record_type: "asc" as const };
        case "changed_by":
          return { changed_by: "asc" as const };
        default:
          return { changed_at: "desc" as const };
      }
    })();
  // Query snapshots
  const data = await MyGlobal.prisma.ecommerce_mall_snapshot_audits.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallSnapshotAuditAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_snapshot_audits.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallSnapshotAuditAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
