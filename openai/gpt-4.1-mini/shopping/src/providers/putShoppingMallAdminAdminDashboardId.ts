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

export async function putShoppingMallAdminAdminDashboardId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallAdminDashboard.IUpdate;
}): Promise<IShoppingMallAdminDashboard> {
  const { admin, id, body } = props;

  const existing =
    await MyGlobal.prisma.shopping_mall_admin_dashboard.findUnique({
      where: { id },
    });

  if (!existing) {
    throw new HttpException("Admin dashboard not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_admin_dashboard.update({
    where: { id },
    data: {
      dashboard_name: body.dashboard_name ?? undefined,
      description: body.description ?? undefined,
    },
  });

  return {
    id: updated.id,
    dashboard_name: updated.dashboard_name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
