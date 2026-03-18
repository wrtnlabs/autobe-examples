import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentTransformer } from "../transformers/HrmPlatformDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberDepartments(props: {
  member: MemberPayload;
  body: IHrmPlatformDepartment.ICreate;
}): Promise<IHrmPlatformDepartment> {
  // 1. Get member's organization and role from employee record
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Member not found in organization", 404);
  }
  const organizationId = employee.hrm_platform_organization_id;
  // 2. Check org:manage permission via role_permissions junction table
  const rolePermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: employee.hrm_platform_role_id,
        permission: {
          code: "org:manage",
        },
      },
    });
  if (!rolePermission) {
    throw new HttpException("Forbidden: requires org:manage permission", 403);
  }
  // 3. Validate parent department if provided
  if (props.body.parent_department_id) {
    const parent = await MyGlobal.prisma.hrm_platform_departments.findFirst({
      where: {
        id: props.body.parent_department_id,
        hrm_platform_organization_id: organizationId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!parent) {
      throw new HttpException(
        "Parent department not found in organization",
        404,
      );
    }
  }
  // 4. Check name uniqueness within organization
  const existing = await MyGlobal.prisma.hrm_platform_departments.findFirst({
    where: {
      hrm_platform_organization_id: organizationId,
      name: props.body.name,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException(
      "Department name already exists in this organization",
      409,
    );
  }
  // 5. Create department
  const department = await MyGlobal.prisma.hrm_platform_departments.create({
    data: {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: organizationId } },
      parent: props.body.parent_department_id
        ? { connect: { id: props.body.parent_department_id } }
        : undefined,
    },
    ...HrmPlatformDepartmentTransformer.select(),
  });
  // 6. Create activity log entry
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      organization_id: organizationId,
      user_id: props.member.id,
      action_type: "department:create",
      target_entity: "department",
      target_id: department.id,
      details: JSON.stringify({
        name: props.body.name,
        description: props.body.description,
        parent_department_id: props.body.parent_department_id,
      }),
      created_at: new Date(),
    },
  });
  // 7. Transform and return
  return await HrmPlatformDepartmentTransformer.transform(department);
}
