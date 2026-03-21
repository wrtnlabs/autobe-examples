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

export async function deleteErpHrmMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get session to find organization context
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.findUnique({
    where: { id: props.member.session_id },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (!session || !session.erp_hrm_organization_id) {
    throw new HttpException("No organization context selected", 400);
  }
  // Get requester's employee record and role with permissions
  const requesterEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
      role: {
        select: {
          id: true,
          name: true,
          is_builtin: true,
          permissions: {
            select: {
              permission: true,
            },
          },
        },
      },
    },
  });
  if (!requesterEmployee) {
    throw new HttpException(
      "You are not an employee in this organization",
      403,
    );
  }
  // Check for employee:manage permission (Owner role bypasses permission check)
  const isOwner = requesterEmployee.role.name === "Owner";
  const hasPermission =
    isOwner ||
    requesterEmployee.role.permissions.some(
      (p) => p.permission === "employee:manage",
    );
  if (!hasPermission) {
    throw new HttpException(
      "You do not have permission to manage employees",
      403,
    );
  }
  // Find target employee
  const targetEmployee = await MyGlobal.prisma.erp_hrm_employees.findUnique({
    where: { id: props.employeeId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      status: true,
      deleted_at: true,
    },
  });
  if (!targetEmployee) {
    throw new HttpException("Employee not found", 404);
  }
  // Verify target employee belongs to same organization
  if (
    targetEmployee.erp_hrm_organization_id !== session.erp_hrm_organization_id
  ) {
    throw new HttpException("Employee not found in your organization", 404);
  }
  // Check if already deactivated (idempotent)
  if (targetEmployee.status === "deactivated") {
    return;
  }
  // Check for active timer
  const activeTimer = await MyGlobal.prisma.erp_hrm_timers.findFirst({
    where: {
      erp_hrm_employee_id: props.employeeId,
      deleted_at: null,
    },
  });
  if (activeTimer) {
    throw new HttpException(
      "Cannot deactivate employee with active timer. Please stop or discard the timer first.",
      409,
    );
  }
  // Perform soft deletion
  await MyGlobal.prisma.erp_hrm_employees.update({
    where: { id: props.employeeId },
    data: {
      status: "deactivated",
      deleted_at: new Date(),
    },
  });
}
