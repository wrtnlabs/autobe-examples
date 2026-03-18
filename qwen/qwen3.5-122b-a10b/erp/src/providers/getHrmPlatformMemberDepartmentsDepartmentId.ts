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
import { HrmPlatformDepartmentAtSummaryTransformer } from "../transformers/HrmPlatformDepartmentAtSummaryTransformer";
import { HrmPlatformDepartmentTransformer } from "../transformers/HrmPlatformDepartmentTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "../transformers/HrmPlatformOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformDepartment> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    } satisfies Prisma.hrm_platform_employeesFindFirstArgs);
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: {
        id: props.departmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        hrm_platform_organization_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        parent: HrmPlatformDepartmentAtSummaryTransformer.select(),
        childDepartments: HrmPlatformDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_departmentsFindUniqueArgs);
  if (
    department.hrm_platform_organization_id !==
    employee.hrm_platform_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmPlatformDepartmentTransformer.transform(department);
}
