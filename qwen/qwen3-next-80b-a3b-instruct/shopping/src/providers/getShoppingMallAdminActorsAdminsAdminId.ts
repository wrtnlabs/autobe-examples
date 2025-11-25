import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminActorsAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin> {
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });

  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }

  return {
    id: admin.id,
    email: admin.email,
    first_name: admin.first_name,
    last_name: admin.last_name,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    status: admin.status satisfies string as
      | "active"
      | "pending_verification"
      | "suspended"
      | "deleted",
    role: typia.assert<"super_admin" | "full_admin" | "limited_admin">(
      "super_admin",
    ),
    deleted_at: typia.assert<string & tags.Format<"date-time">>(
      admin.deleted_at === null
        ? toISOStringSafe(admin.updated_at)
        : toISOStringSafe(admin.deleted_at),
    ),
  };
}
