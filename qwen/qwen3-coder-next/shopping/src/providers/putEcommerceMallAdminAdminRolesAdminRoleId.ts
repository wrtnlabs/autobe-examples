import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminAdminRolesAdminRoleId(props: {
  admin: AdminPayload;
  adminRoleId: string;
  body: IEcommerceMallAdminRole.IUpdate;
}): Promise<IEcommerceMallAdminRole> {
  // Load requesting admin's grade
  const requestingAdmin =
    await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { grade: true },
    });
  if (requestingAdmin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Load target admin role with admin relation
  const targetRole =
    await MyGlobal.prisma.ecommerce_mall_admin_roles.findUniqueOrThrow({
      where: { id: props.adminRoleId },
      include: { admin: true },
    });
  // Self-demotion prevention: super admin cannot demote themselves
  if (
    targetRole.admin_id === props.admin.id &&
    props.body.grade === "regular"
  ) {
    throw new HttpException("Self-demotion prevention", 403);
  }
  // Update role grade
  const updatedRole = await MyGlobal.prisma.ecommerce_mall_admin_roles.update({
    where: { id: props.adminRoleId },
    data: {
      grade: props.body.grade,
      updated_at: new Date(),
    },
    include: { admin: true },
  });
  // Log to admin_action_logs
  await MyGlobal.prisma.ecommerce_mall_admin_action_logs.create({
    data: {
      id: v4(),
      ecommerce_mall_admin_id: props.admin.id,
      action_type: "admin_role_update",
      target_id: targetRole.admin_id,
      description: `Updated admin role ${targetRole.admin_id} grade to ${props.body.grade}`,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Manually construct return object with correct type casting
  const grade = typia.assert<"regular" | "super">(
    updatedRole.grade === "super" ? "super" : "regular",
  );
  return {
    id: updatedRole.id,
    admin: {
      id: updatedRole.admin.id,
      email: updatedRole.admin.email,
      grade: typia.assert<"regular" | "super">(updatedRole.admin.grade),
      created_at: updatedRole.admin.created_at.toISOString(),
    } satisfies IEcommerceMallAdmin.ISummary,
    grade: grade,
    created_at: updatedRole.created_at.toISOString(),
    updated_at: updatedRole.updated_at.toISOString(),
  } satisfies IEcommerceMallAdminRole;
}
