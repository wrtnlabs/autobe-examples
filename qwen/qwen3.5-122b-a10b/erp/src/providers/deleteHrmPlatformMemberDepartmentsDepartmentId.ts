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
  // Step 1: Get member's current organization context
  const memberWithOrg = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    include: {
      employees: {
        where: {
          deleted_at: null,
        },
        select: {
          hrm_platform_organization_id: true,
          hrm_platform_role_id: true,
        },
        take: 1,
      },
    },
  });
  if (!memberWithOrg || memberWithOrg.employees.length === 0) {
    throw new HttpException("No organization context", 403);
  }
  const organizationId =
    memberWithOrg.employees[0].hrm_platform_organization_id;
  const roleId = memberWithOrg.employees[0].hrm_platform_role_id;
  // Step 2: Check org:manage permission
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: {
      id: roleId,
    },
    include: {
      permissions: {
        where: {
          permission: {
            name: "org:manage",
          },
        },
      },
    },
  });
  if (!role || role.permissions.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify department exists and belongs to organization
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: {
        id: props.departmentId,
      },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        name: true,
      },
    });
  if (department.hrm_platform_organization_id !== organizationId) {
    throw new HttpException("Department not found in your organization", 404);
  }
  // Step 4: Count affected employees
  const affectedEmployeeCount =
    await MyGlobal.prisma.hrm_platform_employees.count({
      where: {
        hrm_platform_department_id: props.departmentId,
        deleted_at: null,
      },
    });
  // Step 5: Update affected employees - set department_id to NULL
  const now = new Date().toISOString();
  await MyGlobal.prisma.hrm_platform_employees.updateMany({
    where: {
      hrm_platform_department_id: props.departmentId,
      deleted_at: null,
    },
    data: {
      hrm_platform_department_id: null,
      updated_at: now as string & tags.Format<"date-time">,
    },
  });
  // Step 6: Delete department
  await MyGlobal.prisma.hrm_platform_departments.delete({
    where: {
      id: props.departmentId,
    },
  });
  // Step 7: Record activity log
  const activityId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: activityId,
      organization_id: organizationId,
      user_id: props.member.id,
      action_type: "department:delete",
      target_entity: "department",
      target_id: props.departmentId,
      details: JSON.stringify({
        department_name: department.name,
        affected_employee_count: affectedEmployeeCount,
      }),
      created_at: now as string & tags.Format<"date-time">,
    },
  });
}
