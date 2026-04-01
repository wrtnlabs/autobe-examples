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
import { HrmPlatformDepartmentCollector } from "../collectors/HrmPlatformDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentTransformer } from "../transformers/HrmPlatformDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberDepartments(props: {
  member: MemberPayload;
  body: IHrmPlatformDepartment.ICreate;
}): Promise<IHrmPlatformDepartment> {
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
  if (employee === null) {
    throw new HttpException("You're not enrolled in any organization", 403);
  }
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: employee.hrm_platform_role_id },
    select: {
      permissions: {
        select: {
          permission: {
            select: { id: true },
          },
        },
      },
    },
  });
  const hasOrgManage = role?.permissions.some(
    (p) => p.permission.id === "org:manage",
  );
  if (!hasOrgManage) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.parent_department_id !== undefined &&
    props.body.parent_department_id !== null
  ) {
    const parent = await MyGlobal.prisma.hrm_platform_departments.findFirst({
      where: {
        id: props.body.parent_department_id,
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        deleted_at: null,
      },
    });
    if (parent === null) {
      throw new HttpException(
        "Parent department not found in this organization",
        404,
      );
    }
  }
  const organization: IEntity = {
    id: employee.hrm_platform_organization_id,
  };
  const department = await MyGlobal.prisma.hrm_platform_departments.create({
    data: await HrmPlatformDepartmentCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: organization,
    }),
    ...HrmPlatformDepartmentTransformer.select(),
  });
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      organization_id: employee.hrm_platform_organization_id,
      user_id: props.member.id,
      action_type: "department:created",
      target_entity: "department",
      target_id: department.id,
      details: JSON.stringify({ name: props.body.name }),
      created_at: new Date(),
    },
  });
  return await HrmPlatformDepartmentTransformer.transform(department);
}
