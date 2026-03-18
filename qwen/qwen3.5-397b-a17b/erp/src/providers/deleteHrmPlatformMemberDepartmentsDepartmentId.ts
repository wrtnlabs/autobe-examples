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
  // Find department and verify it belongs to member's organization
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        deleted_at: true,
        children: {
          select: { id: true },
        },
      },
    });
  // Check if department already deleted
  if (department.deleted_at !== null) {
    throw new HttpException("Department not found", 404);
  }
  // Verify member belongs to the same organization as the department
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      organization_id: department.hrm_platform_organization_id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check for child departments
  if (department.children.length > 0) {
    throw new HttpException(
      "Cannot delete department with child departments. Please delete or reassign child departments first.",
      400,
    );
  }
  // Execute deletion in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update all employees with this department to null
    await tx.hrm_platform_employees.updateMany({
      where: { department_id: props.departmentId },
      data: { department_id: null },
    });
    // Soft delete the department
    await tx.hrm_platform_departments.update({
      where: { id: props.departmentId },
      data: { deleted_at: new Date() },
    });
    // Create activity log entry
    await tx.hrm_platform_activity_logs.create({
      data: {
        id: v4(),
        member_id: props.member.id,
        organization_id: department.hrm_platform_organization_id,
        action_type: "department.deleted",
        target_entity_type: "department",
        target_entity_id: props.departmentId,
        details: "Department soft deleted with employee reassignment",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  });
}
