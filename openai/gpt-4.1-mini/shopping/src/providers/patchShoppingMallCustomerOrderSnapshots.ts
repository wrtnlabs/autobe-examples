import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSnapshot";
import { IPaginationInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPaginationInfo";
import { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrderSnapshots(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrderSnapshot.IRequest;
}): Promise<IPageIShoppingMallOrderSnapshot.ISummary> {
  const { body } = props;
  const where: Prisma.shopping_mall_order_snapshotsWhereInput = {};
  if (body.shoppingMallOrderId) {
    where.shopping_mall_order_id = body.shoppingMallOrderId;
  }
  if (body.status) {
    where.status = body.status;
  }
  if (body.customerName) {
    where.customer_name = { contains: body.customerName };
  }
  if (body.customerEmail) {
    where.customer_email = { contains: body.customerEmail };
  }
  if (body.snapshotAt) {
    where.snapshot_at = {};
    if (body.snapshotAt.start) {
      where.snapshot_at.gte = body.snapshotAt.start;
    }
    if (body.snapshotAt.end) {
      where.snapshot_at.lte = body.snapshotAt.end;
    }
  }
  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 50;
  const skip = (page - 1) * limit;
  // Fetch data
  const data = await MyGlobal.prisma.shopping_mall_order_snapshots.findMany({
    where,
    orderBy: { snapshot_at: "desc" },
    skip,
    take: limit,
  });
  // Count total matching records
  const total = await MyGlobal.prisma.shopping_mall_order_snapshots.count({
    where,
  });
  // Map database records to ISummary output with date fields formatted
  const resultData = data.map((record) => ({
    id: record.id,
    shoppingMallOrderId: record.shopping_mall_order_id,
    snapshotAt: toISOStringSafe(record.snapshot_at),
    status: record.status,
    totalPrice: record.total_price,
    customerName: record.customer_name,
    customerEmail: record.customer_email,
    shippingAddress: record.shipping_address,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  }));
  // Prepare pagination info
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: resultData,
  };
}
