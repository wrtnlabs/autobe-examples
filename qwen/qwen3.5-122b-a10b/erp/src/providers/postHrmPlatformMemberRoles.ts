import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformRoleCollector } from "../collectors/HrmPlatformRoleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRoleTransformer } from "../transformers/HrmPlatformRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberRoles(props: {
  member: MemberPayload;
  body: IHrmPlatformRole.ICreate;
}): Promise<IHrmPlatformRole> {
  // Validate built-in role names
  const builtInRoleNames: string[] = ["Owner", "Manager", "Employee"];
  if (builtInRoleNames.includes(props.body.name)) {
    throw new HttpException("Cannot create role with built-in role name", 400);
  }
  // Get member's current organization from employee records
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Member not enrolled in any organization", 403);
  }
  const organizationId: string = employee.hrm_platform_organization_id;
  // Validate user has org:manage permission
  const userRole = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: employee.hrm_platform_role_id },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });
  if (!userRole) {
    throw new HttpException("Role not found", 403);
  }
  const hasOrgManagePermission: boolean = userRole.permissions.some(
    (rp) =>
      rp.permission.code === "org:manage" && rp.permission.deleted_at === null,
  );
  if (!hasOrgManagePermission) {
    throw new HttpException("Forbidden: requires org:manage permission", 403);
  }
  // Validate role name uniqueness within organization
  const existingRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      hrm_platform_organization_id: organizationId,
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existingRole) {
    throw new HttpException(
      "Role name already exists in this organization",
      400,
    );
  }
  // Validate all permission IDs exist and are not soft-deleted
  const permissionIds: string[] = props.body.permission_ids.map(
    (p: IHrmPlatformPermission) => p.id,
  );
  const validPermissions =
    await MyGlobal.prisma.hrm_platform_permissions.findMany({
      where: {
        id: { in: permissionIds },
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (validPermissions.length !== permissionIds.length) {
    throw new HttpException(
      "One or more permission IDs are invalid or soft-deleted",
      400,
    );
  }
  // Create role using collector
  const roleData = await HrmPlatformRoleCollector.collect({
    body: props.body,
    hrmPlatformOrganizations: {
      id: organizationId,
    } as unknown as {
      id: string & tags.Format<"uuid">;
    },
    hrmPlatformMemberSessions: {
      id: props.member.session_id,
    } as unknown as {
      id: string & tags.Format<"uuid">;
    },
  });
  const created = await MyGlobal.prisma.hrm_platform_roles.create({
    data: roleData,
    ...HrmPlatformRoleTransformer.select(),
  });
  return await HrmPlatformRoleTransformer.transform(created);
}
