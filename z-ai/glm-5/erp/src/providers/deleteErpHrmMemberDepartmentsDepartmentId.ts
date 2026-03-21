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

export async function deleteErpHrmMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get session to find current organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        id: true,
        erp_hrm_organization_id: true,
      },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  // Find the employee record for this member in the current organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUnique({
    where: {
      erp_hrm_member_id_erp_hrm_organization_id: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: session.erp_hrm_organization_id,
      },
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if the employee's role has org:manage permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findUnique({
    where: {
      erp_hrm_role_id_permission: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "org:manage",
      },
    },
  });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Find the department and verify it belongs to the current organization
  const department = await MyGlobal.prisma.erp_hrm_departments.findUnique({
    where: { id: props.departmentId },
    select: {
      id: true,
      organization_id: true,
      deleted_at: true,
    },
  });
  if (
    department === null ||
    department.organization_id !== session.erp_hrm_organization_id
  ) {
    throw new HttpException("Department not found", 404);
  }
  if (department.deleted_at !== null) {
    throw new HttpException("Department already deleted", 410);
  }
  // Execute the deletion in a transaction
  await MyGlobal.prisma.$transaction([
    // Clear department reference from all employees
    MyGlobal.prisma.erp_hrm_employees.updateMany({
      where: { erp_hrm_department_id: props.departmentId },
      data: {
        erp_hrm_department_id: null,
        updated_at: new Date(),
      },
    }),
    // Soft delete the department
    MyGlobal.prisma.erp_hrm_departments.update({
      where: { id: props.departmentId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    }),
  ]);
}
