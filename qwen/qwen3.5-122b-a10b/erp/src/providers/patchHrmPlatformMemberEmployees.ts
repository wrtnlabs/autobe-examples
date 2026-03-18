import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberEmployees(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployee.IRequest;
}): Promise<IPageIHrmPlatformEmployee.ISummary> {
  // Resolve member's organization context
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  // Build where clause
  const whereInput: Prisma.hrm_platform_employeesWhereInput = {
    hrm_platform_organization_id: employee.hrm_platform_organization_id,
    deleted_at: null,
    ...(props.body.name && {
      user: {
        display_name: {
          contains: props.body.name,
          mode: "insensitive",
        },
      },
    }),
    ...(props.body.departmentId && {
      hrm_platform_department_id: props.body.departmentId,
    }),
    ...(props.body.employmentType && {
      employment_type: props.body.employmentType,
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
  } satisfies Prisma.hrm_platform_employeesWhereInput;
  // Build order by
  const orderByInput: Prisma.hrm_platform_employeesOrderByWithRelationInput =
    props.body.sort && props.body.order
      ? ({ [props.body.sort]: props.body.order } as const)
      : { created_at: "desc" as const };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Fetch data
  const data = await MyGlobal.prisma.hrm_platform_employees.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy:
      orderByInput satisfies Prisma.hrm_platform_employeesOrderByWithRelationInput,
    ...HrmPlatformEmployeeAtSummaryTransformer.select(),
  });
  // Fetch total count
  const total = await MyGlobal.prisma.hrm_platform_employees.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    HrmPlatformEmployeeAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  } satisfies IPageIHrmPlatformEmployee.ISummary;
}
