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
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirst({
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
    });
  if (!membership) {
    throw new HttpException("Organization context not found", 400);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_employeesWhereInput = {
    organization_id: membership.hrm_platform_organization_id,
    deleted_at: null,
    ...(props.body.department_id !== undefined &&
      props.body.department_id !== null && {
        department_id: props.body.department_id,
      }),
    ...(props.body.employment_type && {
      employment_type: props.body.employment_type,
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.search && {
      position: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
  };
  const data = await MyGlobal.prisma.hrm_platform_employees.findMany({
    where: whereInput,
    skip,
    take: limit,
    ...HrmPlatformEmployeeAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_employees.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformEmployeeAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmPlatformEmployee.ISummary;
}
