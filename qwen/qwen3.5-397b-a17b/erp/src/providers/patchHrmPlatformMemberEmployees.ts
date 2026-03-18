import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: { organization_id: true },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  const organizationId = employee.organization_id;
  const whereInput: Prisma.hrm_platform_employeesWhereInput = {
    organization_id: organizationId,
    deleted_at: null,
    ...(props.body.search && {
      display_name: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.department_id && {
      department_id: props.body.department_id,
    }),
    ...(props.body.employment_type && {
      employment_type: props.body.employment_type,
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
  } satisfies Prisma.hrm_platform_employeesWhereInput;
  const sortField = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "asc";
  const orderByInput = {
    [sortField]: direction,
  } satisfies Prisma.hrm_platform_employeesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrm_platform_employees.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformEmployeeAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_employees.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformEmployeeAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
