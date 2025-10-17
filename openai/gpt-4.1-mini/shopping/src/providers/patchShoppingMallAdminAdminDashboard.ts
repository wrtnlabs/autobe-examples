import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminDashboard";
import { IPageIShoppingMallAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminDashboard";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdminDashboard(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminDashboard.IRequest;
}): Promise<IPageIShoppingMallAdminDashboard.ISummary> {
  const page = (props.body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (props.body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  const where: Prisma.shopping_mall_admin_dashboardWhereInput = {
    deleted_at: null,
    ...(props.body.dashboard_name !== undefined &&
      props.body.dashboard_name !== null && {
        dashboard_name: { contains: props.body.dashboard_name },
      }),
    ...(props.body.description !== undefined &&
      props.body.description !== null && {
        description: { contains: props.body.description },
      }),
    ...((props.body.created_at_min !== undefined &&
      props.body.created_at_min !== null) ||
    (props.body.created_at_max !== undefined &&
      props.body.created_at_max !== null)
      ? {
          created_at: {
            ...(props.body.created_at_min !== undefined &&
              props.body.created_at_min !== null && {
                gte: props.body.created_at_min,
              }),
            ...(props.body.created_at_max !== undefined &&
              props.body.created_at_max !== null && {
                lte: props.body.created_at_max,
              }),
          },
        }
      : {}),
    ...((props.body.updated_at_min !== undefined &&
      props.body.updated_at_min !== null) ||
    (props.body.updated_at_max !== undefined &&
      props.body.updated_at_max !== null)
      ? {
          updated_at: {
            ...(props.body.updated_at_min !== undefined &&
              props.body.updated_at_min !== null && {
                gte: props.body.updated_at_min,
              }),
            ...(props.body.updated_at_max !== undefined &&
              props.body.updated_at_max !== null && {
                lte: props.body.updated_at_max,
              }),
          },
        }
      : {}),
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admin_dashboard.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        dashboard_name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_admin_dashboard.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      dashboard_name: record.dashboard_name,
      description: record.description ?? null,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
