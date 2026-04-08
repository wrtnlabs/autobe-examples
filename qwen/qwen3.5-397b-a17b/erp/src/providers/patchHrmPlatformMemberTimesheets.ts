import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: employee.role_id,
      },
      select: {
        permission: {
          select: {
            code: true,
          },
        },
      },
    });
  const hasTimeApprove = rolePermissions.some(
    (rp) => rp.permission.code === "time:approve",
  );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const take = props.body.take ?? limit;
  const skip = props.body.skip ?? (page - 1) * limit;
  const weekStartDateFilters: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.week_start_date_gte) {
    weekStartDateFilters.gte = new Date(props.body.week_start_date_gte);
  }
  if (props.body.week_start_date_lte) {
    weekStartDateFilters.lte = new Date(props.body.week_start_date_lte);
  }
  const whereInput = {
    deleted_at: null,
    ...(hasTimeApprove
      ? {}
      : {
          employee_id: employee.id,
        }),
    ...(props.body.status && { status: props.body.status }),
    ...(Object.keys(weekStartDateFilters).length > 0 && {
      week_start_date: weekStartDateFilters,
    }),
    ...(props.body.employee_id &&
      hasTimeApprove && {
        employee_id: props.body.employee_id,
      }),
  } satisfies Prisma.hrm_platform_timesheetsWhereInput;
  const sortParts = props.body.sort?.split(":");
  const sortField = sortParts?.[0] ?? "week_start_date";
  const sortDirectionRaw = sortParts?.[1] ?? "DESC";
  const sortDirection =
    sortDirectionRaw.toLowerCase() === "asc" ? "asc" : "desc";
  const orderByInput = {
    [sortField]: sortDirection,
  } satisfies Prisma.hrm_platform_timesheetsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.hrm_platform_timesheets.findMany({
    where: whereInput,
    skip,
    take,
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
      records,
      HrmPlatformTimesheetAtSummaryTransformer.transform,
    ),
  };
}
