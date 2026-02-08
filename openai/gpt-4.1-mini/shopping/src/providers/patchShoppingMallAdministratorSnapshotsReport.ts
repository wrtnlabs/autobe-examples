import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSnapshotReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshotReport";
import { IShoppingMallSnapshotReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorSnapshotsReport(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSnapshotReport.IRequest;
}): Promise<IPageIShoppingMallSnapshotReport.ISummary> {
  // The IRequest type has no pagination or filtering properties, so use fixed page and limit
  const page = 1;
  const limit = 100;
  const skip = 0;
  const orderSnapshots =
    await MyGlobal.prisma.shopping_mall_order_snapshots.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      take: 1000,
    });
  const cancellationSnapshots =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findMany(
      {
        where: { deleted_at: null },
        orderBy: { created_at: "desc" },
        take: 1000,
      },
    );
  const refundSnapshots =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      take: 1000,
    });
  const productSnapshots =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      take: 1000,
    });
  const productVariantSnapshots =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      orderBy: { created_at: "desc" },
      take: 1000,
    });
  const sellerProfileSnapshots =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findMany({
      orderBy: { created_at: "desc" },
      take: 1000,
    });
  type SnapshotUnified = {
    id: string & tags.Format<"uuid">;
    snapshotType: string;
    created_at: string & tags.Format<"date-time">;
    details: object;
  };
  const unifyOrderSnapshots: SnapshotUnified[] = orderSnapshots.map((rec) => ({
    id: rec.id,
    snapshotType: "order",
    created_at: toISOStringSafe(rec.created_at),
    details: {
      shopping_mall_order_id: rec.shopping_mall_order_id,
      snapshot_at: toISOStringSafe(rec.snapshot_at),
      status: rec.status,
      total_price: rec.total_price,
      customer_name: rec.customer_name,
      customer_email: rec.customer_email,
      shipping_address: rec.shipping_address,
    },
  }));
  const unifyCancellationSnapshots: SnapshotUnified[] =
    cancellationSnapshots.map((rec) => ({
      id: rec.id,
      snapshotType: "cancellation_request",
      created_at: toISOStringSafe(rec.created_at),
      details: {
        cancellation_request_id: rec.cancellation_request_id,
        reason: rec.reason,
        status: rec.status,
      },
    }));
  const unifyRefundSnapshots: SnapshotUnified[] = refundSnapshots.map(
    (rec) => ({
      id: rec.id,
      snapshotType: "refund_request",
      created_at: toISOStringSafe(rec.created_at),
      details: {
        shopping_mall_refund_request_id: rec.shopping_mall_refund_request_id,
        status: rec.status,
        reason: rec.reason,
        comment: rec.comment ?? null,
      },
    }),
  );
  const unifyProductSnapshots: SnapshotUnified[] = productSnapshots.map(
    (rec) => ({
      id: rec.id,
      snapshotType: "product",
      created_at: toISOStringSafe(rec.created_at),
      details: {
        shopping_mall_product_id: rec.shopping_mall_product_id,
        name: rec.name,
        description: rec.description,
        category_id: rec.category_id,
        base_price: rec.base_price,
      },
    }),
  );
  const unifyProductVariantSnapshots: SnapshotUnified[] =
    productVariantSnapshots.map((rec) => ({
      id: rec.id,
      snapshotType: "product_variant",
      created_at: toISOStringSafe(rec.created_at),
      details: {
        shopping_mall_product_variant_id: rec.shopping_mall_product_variant_id,
        sku_code: rec.sku_code,
        option_values: rec.option_values,
        price_override: rec.price_override ?? null,
        stock_quantity: rec.stock_quantity,
      },
    }));
  const unifySellerProfileSnapshots: SnapshotUnified[] =
    sellerProfileSnapshots.map((rec) => ({
      id: rec.id,
      snapshotType: "seller_profile",
      created_at: toISOStringSafe(rec.created_at),
      details: {
        shopping_mall_seller_id: rec.shopping_mall_seller_id,
        shop_name: rec.shop_name,
        shop_description: rec.shop_description,
        logo_image_url: rec.logo_image_url ?? null,
      },
    }));
  const allSnapshots = [
    ...unifyOrderSnapshots,
    ...unifyCancellationSnapshots,
    ...unifyRefundSnapshots,
    ...unifyProductSnapshots,
    ...unifyProductVariantSnapshots,
    ...unifySellerProfileSnapshots,
  ];
  allSnapshots.sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );
  const pagedData = allSnapshots.slice(skip, skip + limit);
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: allSnapshots.length,
    pages: Math.ceil(allSnapshots.length / limit),
  };
  return {
    pagination,
    data: pagedData,
  };
}
