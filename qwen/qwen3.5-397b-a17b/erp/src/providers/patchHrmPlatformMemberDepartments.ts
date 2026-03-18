import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentAtSummaryTransformer } from "../transformers/HrmPlatformDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberDepartments(props: {
  member: MemberPayload;
  body: IHrmPlatformDepartment.IRequest;
}): Promise<IPageIHrmPlatformDepartment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: { organization_id: true },
    });
  const whereInput: Prisma.hrm_platform_departmentsWhereInput = {
    hrm_platform_organization_id: employee.organization_id,
    deleted_at: null,
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        name: { contains: props.body.search },
      }),
    ...(props.body.parent_id !== undefined && {
      parent_id: props.body.parent_id,
    }),
  } satisfies Prisma.hrm_platform_departmentsWhereInput;
  const data = await MyGlobal.prisma.hrm_platform_departments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { name: "asc" },
    ...HrmPlatformDepartmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_departments.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformDepartmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
