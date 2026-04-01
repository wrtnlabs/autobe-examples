import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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

export async function putHrmPlatformMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmPlatformEmployee.IUpdate;
}): Promise<IHrmPlatformEmployee> {
  // Find employee to verify existence and get organization context
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        deleted_at: true,
      },
    });
  // Check if soft-deleted
  if (employee.deleted_at !== null) {
    throw new HttpException("Employee not found", 404);
  }
  // Validate department if provided
  if (
    props.body.departmentId !== undefined &&
    props.body.departmentId !== null
  ) {
    await MyGlobal.prisma.hrm_platform_departments.findFirstOrThrow({
      where: {
        id: props.body.departmentId,
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        deleted_at: null,
      },
    });
  }
  // Update employee
  await MyGlobal.prisma.hrm_platform_employees.update({
    where: { id: props.employeeId },
    data: {
      ...(props.body.departmentId !== undefined &&
        props.body.departmentId !== null && {
          hrm_platform_department_id: props.body.departmentId,
        }),
      ...(props.body.position !== undefined &&
        props.body.position !== null && {
          position: props.body.position,
        }),
      ...(props.body.employmentType !== undefined &&
        props.body.employmentType !== null && {
          employment_type: props.body.employmentType,
        }),
      updated_at: new Date(),
    },
  });
  // Fetch updated employee with full relations
  const updated =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        id: true,
        hrm_platform_user_id: true,
        hrm_platform_organization_id: true,
        hrm_platform_role_id: true,
        hrm_platform_department_id: true,
        position: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_image: true,
            phone_number: true,
          },
        },
        role: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            is_builtin: true,
            created_at: true,
            deleted_at: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  return {
    id: updated.id,
    userId: updated.hrm_platform_user_id,
    organizationId: updated.hrm_platform_organization_id,
    roleId: updated.hrm_platform_role_id,
    departmentId: updated.hrm_platform_department_id ?? null,
    position: updated.position ?? null,
    employmentType: updated.employment_type as
      | "full-time"
      | "part-time"
      | "contractor"
      | "intern",
    status: updated.status as "active" | "deactivated",
    createdAt: updated.created_at.toISOString(),
    updatedAt: updated.updated_at.toISOString(),
    deletedAt: updated.deleted_at?.toISOString() ?? null,
    user: {
      id: updated.user.id,
      email: updated.user.email,
      display_name: updated.user.display_name,
      avatar_image: updated.user.avatar_image ?? null,
      phone_number: updated.user.phone_number ?? null,
    },
    role: {
      id: updated.role.id,
      code: updated.role.code,
      name: updated.role.name,
      description: updated.role.description ?? null,
      is_builtin: updated.role.is_builtin,
      permissions: [],
      created_at: updated.role.created_at.toISOString(),
      deleted_at: updated.role.deleted_at?.toISOString() ?? null,
    },
    department: updated.department
      ? {
          id: updated.department.id,
          name: updated.department.name,
          description: updated.department.description ?? null,
          parent_department: null,
          created_at: updated.department.created_at.toISOString(),
          updated_at: updated.department.updated_at.toISOString(),
          deleted_at: updated.department.deleted_at?.toISOString() ?? null,
        }
      : null,
  };
}
