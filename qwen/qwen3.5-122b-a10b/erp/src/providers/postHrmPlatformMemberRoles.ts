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
  // Step 1: Get member's organization context from employee record
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      role: {
        select: {
          permissions: {
            where: { deleted_at: null },
            select: {
              permission: {
                select: { code: true },
              },
            },
          },
        },
      },
    },
  });
  if (!employee) {
    throw new HttpException("Member has no organization membership", 403);
  }
  const organizationId = employee.hrm_platform_organization_id as string &
    tags.Format<"uuid">;
  // Step 2: Validate org:manage permission
  const hasOrgManage = employee.role?.permissions.some(
    (rp) => rp.permission.code === "org:manage",
  );
  if (!hasOrgManage) {
    throw new HttpException("Forbidden: requires org:manage permission", 403);
  }
  // Step 3: Validate role name uniqueness within organization
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
  // Step 4: Validate built-in role names are not used
  const builtInNames = ["Owner", "Manager", "Employee"];
  if (builtInNames.includes(props.body.name)) {
    throw new HttpException(
      "Cannot create role with a built-in role name",
      400,
    );
  }
  // Step 5: Validate all permission IDs exist and are active
  if (props.body.permission_ids.length > 0) {
    const permissionIds = props.body.permission_ids.map((p) => p.id);
    const validPermissions =
      await MyGlobal.prisma.hrm_platform_permissions.findMany({
        where: {
          id: { in: permissionIds },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (validPermissions.length !== permissionIds.length) {
      throw new HttpException(
        "One or more permission IDs are invalid or have been deleted",
        400,
      );
    }
  }
  // Step 6: Create role using collector
  const organization: IEntity = { id: organizationId };
  const created = await MyGlobal.prisma.hrm_platform_roles.create({
    data: await HrmPlatformRoleCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: organization,
    }),
    ...HrmPlatformRoleTransformer.select(),
  });
  // Step 7: Transform and return
  return await HrmPlatformRoleTransformer.transform(created);
}
