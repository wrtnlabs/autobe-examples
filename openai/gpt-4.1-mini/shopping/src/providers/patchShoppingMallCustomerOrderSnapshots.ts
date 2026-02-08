import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSnapshot";
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
  const {
    page = 1,
    limit = 100,
    shopping_mall_order_id,
    customer_name,
    status,
    snapshot_at_from,
    snapshot_at_to,
    total_price_from,
    total_price_to,
  } = props.body as unknown as {
    page?: number;
    limit?: number;
    shopping_mall_order_id?: string;
    customer_name?: string;
    status?: string;
    snapshot_at_from?: string & tags.Format<"date-time">;
    snapshot_at_to?: string & tags.Format<"date-time">;
    total_price_from?: number;
    total_price_to?: number;
  };
  if (page <= 0 || limit <= 0) {
    throw new HttpException("Page and limit must be positive integers", 400);
  }
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_order_snapshotsWhereInput = {
    deleted_at: null,
    order: { customer: { id: props.customer.id } },
  };
  if (shopping_mall_order_id !== undefined) {
    where.shopping_mall_order_id = shopping_mall_order_id;
  }
  if (customer_name !== undefined) {
    where.customer_name = { contains: customer_name, mode: "insensitive" };
  }
  if (status !== undefined) {
    where.status = status;
  }
  if (snapshot_at_from !== undefined || snapshot_at_to !== undefined) {
    where.snapshot_at = {};
    if (snapshot_at_from !== undefined) {
      where.snapshot_at.gte = snapshot_at_from;
    }
    if (snapshot_at_to !== undefined) {
      where.snapshot_at.lte = snapshot_at_to;
    }
  }
  if (total_price_from !== undefined || total_price_to !== undefined) {
    where.total_price = {};
    if (total_price_from !== undefined) {
      where.total_price.gte = total_price_from;
    }
    if (total_price_to !== undefined) {
      where.total_price.lte = total_price_to;
    }
  }
  const data = await MyGlobal.prisma.shopping_mall_order_snapshots.findMany({
    where,
    skip,
    take: limit,
    orderBy: { snapshot_at: "desc" },
  });
  const total = await MyGlobal.prisma.shopping_mall_order_snapshots.count({
    where,
  });
  // Use toISOStringSafe to convert Date fields to string & tags.Format<'date-time'>
  const formattedData = data.map((record) => ({
    id: record.id,
    shopping_mall_order_id: record.shopping_mall_order_id,
    snapshot_at: toISOStringSafe(record.snapshot_at),
    status: record.status,
    total_price: record.total_price,
    customer_name: record.customer_name,
    customer_email: record.customer_email,
    shipping_address: record.shipping_address,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  }));
  return {
    data: formattedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
