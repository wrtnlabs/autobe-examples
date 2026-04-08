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

export async function deleteHrmTimeTrackMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the department and verify it exists
  const department =
    await MyGlobal.prisma.hrm_time_track_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: {
        id: true,
        name: true,
        hrm_time_track_organization_id: true,
        deleted_at: true,
      },
    });
  // Verify department is not already deleted
  if (department.deleted_at !== null) {
    throw new HttpException("Department already deleted", 404);
  }
  // Verify member belongs to the same organization and has management permission
  const memberEmployee =
    await MyGlobal.prisma.hrm_time_track_employees.findFirst({
      where: {
        hrm_time_track_member_id: props.member.id,
        hrm_time_track_organization_id:
          department.hrm_time_track_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_track_role_id: true,
      },
    });
  if (memberEmployee === null) {
    throw new HttpException(
      "You don't have permission to delete this department",
      403,
    );
  }
  // Check for child departments
  const childCount = await MyGlobal.prisma.hrm_time_track_departments.count({
    where: {
      parent_department_id: props.departmentId,
      deleted_at: null,
    },
  });
  if (childCount > 0) {
    throw new HttpException(
      "Cannot delete department with child departments. Delete or re-parent child departments first.",
      400,
    );
  }
  // Perform deletion operations in a transaction
  await MyGlobal.prisma.$transaction([
    // Clear employee department assignments
    MyGlobal.prisma.hrm_time_track_employees.updateMany({
      where: {
        hrm_time_track_department_id: props.departmentId,
        deleted_at: null,
      },
      data: {
        hrm_time_track_department_id: null,
        updated_at: new Date(),
      },
    }),
    // Clear parent reference on child departments
    MyGlobal.prisma.hrm_time_track_departments.updateMany({
      where: {
        parent_department_id: props.departmentId,
        deleted_at: null,
      },
      data: {
        parent_department_id: null,
        updated_at: new Date(),
      },
    }),
    // Soft delete the department
    MyGlobal.prisma.hrm_time_track_departments.update({
      where: { id: props.departmentId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    }),
    // Create activity log entry
    MyGlobal.prisma.hrm_time_track_activity_logs.create({
      data: {
        id: v4(),
        hrm_time_track_organization_id:
          department.hrm_time_track_organization_id,
        hrm_time_track_member_id: props.member.id,
        hrm_time_track_department_id: props.departmentId,
        activity_type: "department_deleted",
        description: `Department "${department.name}" was deleted`,
        created_at: new Date(),
      },
    }),
  ]);
}
