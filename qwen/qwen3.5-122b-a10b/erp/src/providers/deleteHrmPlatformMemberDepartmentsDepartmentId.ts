import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmPlatformMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify department exists
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: { id: true, hrm_platform_organization_id: true },
    });
  // Step 2: Check org:manage permission by querying member's role in organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: department.hrm_platform_organization_id,
      deleted_at: null,
    },
    select: { hrm_platform_role_id: true },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if role has org:manage permission
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: employee.hrm_platform_role_id },
    select: {
      id: true,
      permissions: {
        select: {
          permission: {
            select: { id: true },
          },
        },
      },
    },
  });
  if (!role) {
    throw new HttpException("Forbidden", 403);
  }
  const hasOrgManagePermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: role.id,
        permission: {
          id: "org:manage",
        },
      },
    });
  if (!hasOrgManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Count affected employees
  const affectedEmployeeCount =
    await MyGlobal.prisma.hrm_platform_employees.count({
      where: {
        hrm_platform_department_id: props.departmentId,
        deleted_at: null,
      },
    });
  // Step 4: Update affected employees - set department_id to NULL
  await MyGlobal.prisma.hrm_platform_employees.updateMany({
    where: {
      hrm_platform_department_id: props.departmentId,
    },
    data: {
      hrm_platform_department_id: null,
      updated_at: new Date(),
    },
  });
  // Step 5: Delete department (cascade handles children)
  await MyGlobal.prisma.hrm_platform_departments.delete({
    where: { id: props.departmentId },
  });
  // Step 6: Create activity log entry
  const activityId = v4();
  const activityDetails = {
    affected_employee_count: affectedEmployeeCount,
  };
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: activityId,
      organization_id: department.hrm_platform_organization_id,
      user_id: props.member.id,
      action_type: "department:delete",
      target_entity: "department",
      target_id: props.departmentId,
      details: JSON.stringify(activityDetails),
      created_at: new Date(),
    },
  });
}
