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

export async function deleteHrmPlatformAdminDepartmentsDepartmentId(props: {
  admin: AdminPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: {
        id: props.departmentId,
      },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        deleted_at: true,
      },
    });
  if (department.deleted_at !== null) {
    throw new HttpException("Department already deleted", 404);
  }
  const session = await MyGlobal.prisma.hrm_platform_admin_sessions.findUnique({
    where: {
      id: props.admin.session_id,
    },
    select: {
      hrm_platform_admin_id: true,
    },
  });
  if (session === null) {
    throw new HttpException("Forbidden", 403);
  }
  const admin = await MyGlobal.prisma.hrm_platform_admins.findUnique({
    where: {
      id: session.hrm_platform_admin_id,
    },
    select: {
      id: true,
    },
  });
  if (admin === null) {
    throw new HttpException("Forbidden", 403);
  }
  const employeeCount = await MyGlobal.prisma.hrm_platform_employees.count({
    where: {
      department_id: props.departmentId,
      deleted_at: null,
    },
  });
  const childDepartmentCount =
    await MyGlobal.prisma.hrm_platform_departments.count({
      where: {
        parent_id: props.departmentId,
        deleted_at: null,
      },
    });
  await MyGlobal.prisma.hrm_platform_employees.updateMany({
    where: {
      department_id: props.departmentId,
      deleted_at: null,
    },
    data: {
      department_id: null,
      updated_at: new Date(),
    },
  });
  await MyGlobal.prisma.hrm_platform_departments.updateMany({
    where: {
      parent_id: props.departmentId,
      deleted_at: null,
    },
    data: {
      parent_id: null,
      updated_at: new Date(),
    },
  });
  await MyGlobal.prisma.hrm_platform_departments.update({
    where: {
      id: props.departmentId,
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  const activityLogId = v4();
  const now = new Date();
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: activityLogId,
      hrm_platform_organization_id: department.hrm_platform_organization_id,
      action_type: "department_deleted",
      target_entity_type: "department",
      target_entity_id: props.departmentId,
      action_description: `Department deleted. ${employeeCount} employee(s) reassigned, ${childDepartmentCount} child department(s) preserved.`,
      created_at: now,
    },
  });
}
