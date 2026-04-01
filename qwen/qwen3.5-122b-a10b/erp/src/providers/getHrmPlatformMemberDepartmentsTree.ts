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

export async function getHrmPlatformMemberDepartmentsTree(props: {
  member: MemberPayload;
}): Promise<IHrmPlatformDepartment[]> {
  // Resolve member's organization through employee relationship
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      hrm_platform_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Member has no organization context", 403);
  }
  // Query top-level departments for the organization
  const topDepartments =
    await MyGlobal.prisma.hrm_platform_departments.findMany({
      where: {
        hrm_platform_organization_id: employee.hrm_platform_organization_id,
        parent_department_id: null,
        deleted_at: null,
      },
      ...HrmPlatformDepartmentTransformer.select(),
      orderBy: { name: "asc" },
    } satisfies Prisma.hrm_platform_departmentsFindManyArgs);
  // Transform all departments to DTO format
  return await ArrayUtil.asyncMap(
    topDepartments,
    HrmPlatformDepartmentTransformer.transform,
  );
}
