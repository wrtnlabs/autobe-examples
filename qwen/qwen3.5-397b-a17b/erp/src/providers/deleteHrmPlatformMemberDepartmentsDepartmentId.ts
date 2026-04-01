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
  const department = await MyGlobal.prisma.hrm_platform_departments.findUnique({
    where: {
      id: props.departmentId,
      deleted_at: null,
    },
  });
  if (!department) {
    throw new HttpException("Department not found", 404);
  }
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: department.organization_id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found in organization", 404);
  }
  const permission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: employee.role_id,
        permission: "org:manage",
        deleted_at: null,
      },
    });
  if (!permission) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_platform_employees.updateMany({
      where: {
        department_id: props.departmentId,
      },
      data: {
        department_id: null,
      },
    });
    await tx.hrm_platform_departments.updateMany({
      where: {
        parent_department_id: props.departmentId,
      },
      data: {
        parent_department_id: null,
      },
    });
    await tx.hrm_platform_departments.update({
      where: {
        id: props.departmentId,
      },
      data: {
        deleted_at: new Date(),
      },
    });
    await tx.hrm_platform_activity_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: department.organization_id,
        member_id: props.member.id,
        action_type: "department.deleted",
        target_entity_type: "department",
        target_entity_id: props.departmentId,
        details: JSON.stringify({
          department_name: department.name,
          deleted_at: new Date().toISOString(),
        }),
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  });
}
