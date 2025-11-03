import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActivity";
import { IPageIShoppingMallAdminActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminActivity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdminActivities(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminActivity.IRequest;
}): Promise<IPageIShoppingMallAdminActivity.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const orderByField = body.orderBy ?? "created_at";
  const orderByDirection = body.orderDirection === "asc" ? "asc" : "desc";

  const where: Prisma.shopping_mall_admin_activitiesWhereInput = {
    ...(body.filterAdminId !== undefined &&
      body.filterAdminId !== null && {
        shopping_mall_admin_id: body.filterAdminId,
      }),
    ...((body.createdAtFrom !== undefined && body.createdAtFrom !== null) ||
    (body.createdAtTo !== undefined && body.createdAtTo !== null)
      ? {
          created_at: {
            ...(body.createdAtFrom !== undefined &&
              body.createdAtFrom !== null && { gte: body.createdAtFrom }),
            ...(body.createdAtTo !== undefined &&
              body.createdAtTo !== null && { lte: body.createdAtTo }),
          },
        }
      : {}),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [{ activity: { contains: body.search } }],
      }),
  };

  const total = await MyGlobal.prisma.shopping_mall_admin_activities.count({
    where,
  });

  const results = await MyGlobal.prisma.shopping_mall_admin_activities.findMany(
    {
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: limit,
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            full_name: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    },
  );

  const data = results.map((item) => ({
    id: item.id,
    shopping_mall_admin_id: item.shopping_mall_admin_id,
    activity: item.activity,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    admin: item.admin
      ? {
          id: item.admin.id,
          email: item.admin.email,
          full_name: item.admin.full_name,
          created_at: toISOStringSafe(item.admin.created_at),
          updated_at: toISOStringSafe(item.admin.updated_at),
          deleted_at: item.admin.deleted_at
            ? toISOStringSafe(item.admin.deleted_at)
            : null,
        }
      : undefined,
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data,
  };
}
