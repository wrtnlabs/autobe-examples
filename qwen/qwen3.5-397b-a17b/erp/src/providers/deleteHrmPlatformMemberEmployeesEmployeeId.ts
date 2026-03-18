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

export async function deleteHrmPlatformMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Query the employee record to verify existence and get organization/role info
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
      } satisfies Prisma.hrm_platform_employeesWhereUniqueInput,
      select: {
        id: true,
        organization_id: true,
        role_id: true,
        member_id: true,
      },
    });
  // Query the requesting member's employee record in the same organization to verify permissions
  const requestingEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        organization_id: employee.organization_id,
        deleted_at: null,
      } satisfies Prisma.hrm_platform_employeesWhereInput,
      select: {
        id: true,
        role_id: true,
      },
    });
  // Check if requesting employee has employee:manage permission
  const hasPermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        role_id: requestingEmployee.role_id,
        permission: "employee:manage",
      } satisfies Prisma.hrm_platform_role_permissionsWhereInput,
    });
  // Also allow if requesting employee has Owner role (built-in full access)
  const requestingRole =
    await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
      where: {
        id: requestingEmployee.role_id,
      } satisfies Prisma.hrm_platform_rolesWhereUniqueInput,
      select: {
        built_in: true,
        name: true,
      },
    });
  const isOwner = requestingRole.built_in && requestingRole.name === "Owner";
  if (!hasPermission && !isOwner) {
    throw new HttpException(
      "Forbidden: employee:manage permission required",
      403,
    );
  }
  // Check if the employee being deactivated has Owner role
  const targetRole = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow(
    {
      where: {
        id: employee.role_id,
      } satisfies Prisma.hrm_platform_rolesWhereUniqueInput,
      select: {
        built_in: true,
        name: true,
      },
    },
  );
  // If target employee is Owner, verify there are other active Owners
  if (targetRole.built_in && targetRole.name === "Owner") {
    const otherActiveOwners =
      await MyGlobal.prisma.hrm_platform_employees.count({
        where: {
          organization_id: employee.organization_id,
          role_id: employee.role_id,
          id: {
            not: employee.id,
          },
          deleted_at: null,
          status: "active",
        } satisfies Prisma.hrm_platform_employeesWhereInput,
      });
    if (otherActiveOwners === 0) {
      throw new HttpException(
        "Cannot deactivate: at least one active Owner must remain in the organization",
        400,
      );
    }
  }
  // Check for active timer and stop it if exists
  const activeTimer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      employee_id: props.employeeId,
      stopped_at: null,
      deleted_at: null,
    } satisfies Prisma.hrm_platform_timersWhereInput,
  });
  if (activeTimer) {
    // Stop the timer by setting stopped_at
    await MyGlobal.prisma.hrm_platform_timers.update({
      where: {
        id: activeTimer.id,
      } satisfies Prisma.hrm_platform_timersWhereUniqueInput,
      data: {
        stopped_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // Perform soft delete: set deleted_at and status to deactivated
  await MyGlobal.prisma.hrm_platform_employees.update({
    where: {
      id: props.employeeId,
    } satisfies Prisma.hrm_platform_employeesWhereUniqueInput,
    data: {
      deleted_at: new Date(),
      status: "deactivated",
      updated_at: new Date(),
    },
  });
  // Create activity log entry
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member_id: props.member.id,
      organization_id: employee.organization_id,
      action_type: "employee.deactivated",
      target_entity_type: "employee",
      target_entity_id: props.employeeId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
}
