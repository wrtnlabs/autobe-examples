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
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Member not found in organization", 404);
  }
  const departments = await MyGlobal.prisma.hrm_platform_departments.findMany({
    where: {
      hrm_platform_organization_id: employee.hrm_platform_organization_id,
      parent_department_id: null,
      deleted_at: null,
    },
    orderBy: {
      name: "asc",
    },
    ...HrmPlatformDepartmentTransformer.select(),
  });
  return await ArrayUtil.asyncMap(
    departments,
    HrmPlatformDepartmentTransformer.transform,
  );
}
