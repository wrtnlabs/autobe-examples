import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetAtSummaryTransformer } from "../transformers/HrmPlatformTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmPlatformTimesheet.IRequest;
}): Promise<IPageIHrmPlatformTimesheet.ISummary> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role_id: true,
      },
    });
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: employee.role_id },
    select: {
      is_builtin: true,
      rolePermissions: {
        select: {
          permission: true,
        },
      },
    },
  });
  const hasViewAll =
    role.is_builtin ||
    role.rolePermissions.some(
      (p: { permission: string }) => p.permission === "time:view_all",
    );
  const hasApprove =
    role.is_builtin ||
    role.rolePermissions.some(
      (p: { permission: string }) => p.permission === "time:approve",
    );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_timesheetsWhereInput = {
    deleted_at: null,
    employee: {
      organization_id: employee.organization_id,
      ...(hasViewAll ? {} : { id: employee.id }),
    },
    ...(hasApprove || hasViewAll
      ? {}
      : { status: { in: ["draft", "submitted", "approved", "rejected"] } }),
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.week_start_date !== undefined &&
      props.body.week_start_date !== null && {
        week_start_date: { gte: props.body.week_start_date },
      }),
    ...(props.body.week_end_date !== undefined &&
      props.body.week_end_date !== null && {
        week_end_date: { lte: props.body.week_end_date },
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        rejection_reason: { contains: props.body.search },
      }),
  } satisfies Prisma.hrm_platform_timesheetsWhereInput;
  const sortField = props.body.sort?.split(":")[0] ?? "week_start_date";
  const sortDir = (props.body.sort?.split(":")[1] ?? "desc") as "asc" | "desc";
  const validSortFields = [
    "week_start_date",
    "week_end_date",
    "status",
    "created_at",
    "updated_at",
    "submitted_at",
    "reviewed_at",
  ];
  const safeSortField = validSortFields.includes(sortField)
    ? sortField
    : "week_start_date";
  const orderByInput: Prisma.hrm_platform_timesheetsOrderByWithRelationInput = {
    [safeSortField]: sortDir,
  };
  const data = await MyGlobal.prisma.hrm_platform_timesheets.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformTimesheetAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_timesheets.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformTimesheetAtSummaryTransformer.transform,
    ),
  };
}
