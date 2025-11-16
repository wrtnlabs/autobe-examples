import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSalesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesSnapshot";
import { IPageIShoppingMallSalesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalesSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallSalesSnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallSalesSnapshot.IRequest;
}): Promise<IPageIShoppingMallSalesSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.shopping_mall_sales_snapshotsWhereInput = {
    ...(props.body.search
      ? {
          OR: [] as Array<Prisma.shopping_mall_sales_snapshotsWhereInput>,
        }
      : {}),
    ...(props.body.filter?.snapshot_date_start ||
    props.body.filter?.snapshot_date_end
      ? {
          snapshot_date: {
            ...(props.body.filter?.snapshot_date_start
              ? { gte: props.body.filter.snapshot_date_start }
              : {}),
            ...(props.body.filter?.snapshot_date_end
              ? { lte: props.body.filter.snapshot_date_end }
              : {}),
          },
        }
      : {}),
    ...(props.body.filter?.product_id
      ? { product_id: props.body.filter.product_id }
      : {}),
    ...(props.body.filter?.min_units_sold || props.body.filter?.max_units_sold
      ? {
          units_sold: {
            ...(props.body.filter?.min_units_sold
              ? { gte: props.body.filter.min_units_sold }
              : {}),
            ...(props.body.filter?.max_units_sold
              ? { lte: props.body.filter.max_units_sold }
              : {}),
          },
        }
      : {}),
    ...(props.body.filter?.min_revenue || props.body.filter?.max_revenue
      ? {
          revenue: {
            ...(props.body.filter?.min_revenue
              ? { gte: props.body.filter.min_revenue }
              : {}),
            ...(props.body.filter?.max_revenue
              ? { lte: props.body.filter.max_revenue }
              : {}),
          },
        }
      : {}),
    ...(props.body.filter?.seller_id
      ? { seller_id: props.body.filter.seller_id }
      : {}),
  };

  const orderBy: { [key: string]: "asc" | "desc" } = props.body.orderBy
    ? { [props.body.orderBy]: props.body.desc ? "desc" : "asc" }
    : { created_at: "desc" };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sales_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_sales_snapshots.count({ where }),
  ]);

  return {
    data: records.map((record) => ({
      id: record.id,
      created_at: toISOStringSafe(record.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
