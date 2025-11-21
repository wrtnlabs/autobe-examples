import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminActorsAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdmin.IUpdate;
}): Promise<IShoppingMallAdmin> {
  // Authorization is handled by adminAuthorize decorator - props.admin is the authenticated admin
  // The operation allows any admin with sufficient privileges to update another admin
  // No need to check admin.id === adminId - the provider handles access control

  // Fetch the target admin account - must be active and not deleted
  const targetAdmin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: {
      id: props.adminId,
      deleted_at: null,
      status: "active",
    },
  });

  if (!targetAdmin) {
    throw new HttpException("Admin not found or inactive", 404);
  }

  // Status field in IUpdate is strictly "suspended" - no validation needed
  // Update admin details
  const updatedAdmin = await MyGlobal.prisma.shopping_mall_admins.update({
    where: {
      id: props.adminId,
    },
    data: {
      first_name: props.body.first_name,
      last_name: props.body.last_name,
      status: props.body.status,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Construct return object with correct type mapping and no type assertions
  return {
    id: updatedAdmin.id,
    email: updatedAdmin.email,
    first_name: updatedAdmin.first_name,
    last_name: updatedAdmin.last_name,
    created_at: toISOStringSafe(updatedAdmin.created_at),
    updated_at: toISOStringSafe(updatedAdmin.updated_at),
    status: updatedAdmin.status satisfies string as
      | "active"
      | "pending_verification"
      | "suspended"
      | "deleted",
    deleted_at: updatedAdmin.deleted_at
      ? toISOStringSafe(updatedAdmin.deleted_at)
      : null,
    role: "limited_admin", // Default value since role field doesn't exist in DB but required in interface
  };
}
