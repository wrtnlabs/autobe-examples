import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
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

export async function postHrmTrackerMemberEmployeesEmployeeIdRole(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmTrackerEmployee.IAssign;
}): Promise<void> {
  const { member, employeeId, body } = props;
  const now = toISOStringSafe(new Date());
  const employee =
    await MyGlobal.prisma.hrm_tracker_employees.findUniqueOrThrow({
      where: { id: employeeId },
      select: {
        id: true,
        organization_id: true,
        role_id: true,
        user_id: true,
      },
    });
  const organization =
    await MyGlobal.prisma.hrm_tracker_organizations.findUniqueOrThrow({
      where: { id: employee.organization_id },
      select: {
        id: true,
        owner_member_id: true,
      },
    });
  // Find the member's own employee record in the same organization
  const memberEmployee =
    await MyGlobal.prisma.hrm_tracker_employees.findFirstOrThrow({
      where: {
        user_id: member.id,
        organization_id: employee.organization_id,
        deleted_at: null,
      },
      select: { id: true, role_id: true },
    });
  // If member has no role, they can't have permissions
  if (memberEmployee.role_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if member's role has 'employee:manage' permission by joining through role_permissions
  const rolePermissions =
    await MyGlobal.prisma.hrm_tracker_role_permissions.findMany({
      where: {
        role_id: memberEmployee.role_id,
      },
      select: {
        permission_id: true,
      },
    });
  if (rolePermissions.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  // Get the actual permission records to check for 'employee:manage'
  const permissions = await MyGlobal.prisma.hrm_tracker_permissions.findMany({
    where: {
      id: { in: rolePermissions.map((rp) => rp.permission_id) },
    },
  });
  // Check if any permission has the 'employee:manage' code
  const hasManagePermission = permissions.some(
    (p) => p.permission === "employee:manage",
  );
  // Only owners or users with employee:manage permission can assign roles
  if (organization.owner_member_id !== member.id && !hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  if (body.role_id !== undefined && body.role_id !== null) {
    // Verify role belongs to the same organization
    const role = await MyGlobal.prisma.hrm_tracker_roles.findUniqueOrThrow({
      where: { id: body.role_id },
      select: {
        id: true,
        hrm_tracker_organization_id: true,
      },
    });
    if (role.hrm_tracker_organization_id !== employee.organization_id) {
      throw new HttpException(
        "Role does not belong to employee's organization",
        400,
      );
    }
    await MyGlobal.prisma.hrm_tracker_employees.update({
      where: { id: employeeId },
      data: {
        role_id: body.role_id,
        updated_at: now,
      },
    });
    await MyGlobal.prisma.hrm_tracker_activity_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        hrm_tracker_member_id: member.id,
        target_entity_type: "employee",
        target_entity_id: employeeId,
        action_type: "role_assigned",
        created_at: now,
      },
    });
  } else {
    await MyGlobal.prisma.hrm_tracker_employees.update({
      where: { id: employeeId },
      data: {
        role_id: null,
        updated_at: now,
      },
    });
    await MyGlobal.prisma.hrm_tracker_activity_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        hrm_tracker_member_id: member.id,
        target_entity_type: "employee",
        target_entity_id: employeeId,
        action_type: "role_removed",
        created_at: now,
      },
    });
  }
}
