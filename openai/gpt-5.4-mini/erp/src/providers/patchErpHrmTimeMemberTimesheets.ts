import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimesheetAtSummaryTransformer } from "../transformers/ErpHrmTimeTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberTimesheets(props: {
  member: MemberPayload;
  body: IErpHrmTimeTimesheet.IRequest;
}): Promise<IPageIErpHrmTimeTimesheet.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.erp_hrm_time_timesheetsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.weekStartDateFrom !== undefined
      ? {
          week_start_date: {
            gte: new globalThis.Date(props.body.weekStartDateFrom),
          },
        }
      : {}),
    ...(props.body.weekStartDateTo !== undefined
      ? {
          week_start_date: {
            lte: new globalThis.Date(props.body.weekStartDateTo),
          },
        }
      : {}),
    ...(props.body.weekEndDateFrom !== undefined
      ? {
          week_end_date: {
            gte: new globalThis.Date(props.body.weekEndDateFrom),
          },
        }
      : {}),
    ...(props.body.weekEndDateTo !== undefined
      ? {
          week_end_date: { lte: new globalThis.Date(props.body.weekEndDateTo) },
        }
      : {}),
  };
  const orderBy: Prisma.erp_hrm_time_timesheetsOrderByWithRelationInput =
    props.body.sort === "updated_at"
      ? { updated_at: props.body.order ?? "desc" }
      : props.body.sort === "week_start_date"
        ? { week_start_date: props.body.order ?? "desc" }
        : props.body.sort === "week_end_date"
          ? { week_end_date: props.body.order ?? "desc" }
          : props.body.sort === "status"
            ? { status: props.body.order ?? "desc" }
            : { created_at: props.body.order ?? "desc" };
  const data = await MyGlobal.prisma.erp_hrm_time_timesheets.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...ErpHrmTimeTimesheetAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_time_timesheets.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeTimesheetAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
