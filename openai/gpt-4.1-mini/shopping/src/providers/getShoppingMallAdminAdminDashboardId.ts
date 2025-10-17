import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminDashboard";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAdminDashboardId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminDashboard> {
  const { admin, id } = props;

  const adminExists = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: admin.id,
      status: "active",
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!adminExists) {
    throw new HttpException("Unauthorized: Admin not active or not found", 403);
  }

  const dashboard =
    await MyGlobal.prisma.shopping_mall_admin_dashboard.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        dashboard_name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: dashboard.id,
    dashboard_name: dashboard.dashboard_name,
    description: dashboard.description ?? null,
    created_at: toISOStringSafe(dashboard.created_at),
    updated_at: toISOStringSafe(dashboard.updated_at),
    deleted_at: dashboard.deleted_at
      ? toISOStringSafe(dashboard.deleted_at)
      : null,
  };
}
