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

export async function deleteErpHrmAdminEmployeesEmployeeId(props: {
  admin: AdminPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the employee to delete (must not already be deleted)
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      id: props.employeeId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_member_id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // 2. Get organization details for permission verification
  const organization = await MyGlobal.prisma.erp_hrm_organizations.findFirst({
    where: {
      id: employee.erp_hrm_organization_id,
    },
    select: {
      id: true,
      owner_id: true,
    },
  });
  if (!organization) {
    throw new HttpException("Organization not found", 404);
  }
  // 3. Get admin's employee record to verify role permissions
  const adminEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.admin.id,
      erp_hrm_organization_id: organization.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
      role: {
        select: {
          name: true,
          rolePermissions: {
            select: {
              permission: true,
            },
          },
        },
      },
    },
  });
  if (!adminEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Verify admin has proper authorization (owner or employee:manage permission)
  const isOwner = organization.owner_id === props.admin.id;
  const hasEmployeeManagePermission = adminEmployee.role.rolePermissions.some(
    (rp) => rp.permission === "employee:manage",
  );
  if (!isOwner && !hasEmployeeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Prevent self-deletion when admin is the sole organization owner
  const isSelfDeletion = employee.erp_hrm_member_id === props.admin.id;
  if (isSelfDeletion && isOwner) {
    throw new HttpException(
      "Cannot delete your own employee record while being the sole owner",
      403,
    );
  }
  // 6. Perform soft delete
  const deletedAt = new Date();
  await MyGlobal.prisma.erp_hrm_employees.update({
    where: { id: props.employeeId },
    data: {
      deleted_at: deletedAt,
      status: "deactivated",
    },
  });
  // 7. Record activity log for audit trail
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      erp_hrm_organization_id: organization.id,
      erp_hrm_member_id: props.admin.id,
      action_type: "employee_deactivated",
      target_entity_type: "employee",
      target_entity_id: props.employeeId,
      details: JSON.stringify({
        deactivated_employee_id: props.employeeId,
        deactivated_at: deletedAt.toISOString(),
      }),
      created_at: deletedAt,
    },
  });
}
