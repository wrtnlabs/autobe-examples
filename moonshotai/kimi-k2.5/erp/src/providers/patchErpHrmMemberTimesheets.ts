import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetAtSummaryTransformer } from "../transformers/ErpHrmTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberTimesheets(props: {
  member: MemberPayload;
  body: IErpHrmTimesheet.IRequest;
}): Promise<IPageIErpHrmTimesheet.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.erp_hrm_timesheetsWhereInput = {
    deleted_at: null,
  };
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  if (props.body.organizationMemberId !== undefined) {
    where.organization_member_id = props.body.organizationMemberId;
  } else {
    where.organizationMember = {
      user_id: props.member.id,
    };
  }
  if (
    props.body.weekStartDateFrom !== undefined ||
    props.body.weekStartDateTo !== undefined
  ) {
    const weekStartFilter: {
      gte?: string;
      lte?: string;
    } = {};
    if (props.body.weekStartDateFrom !== undefined) {
      weekStartFilter.gte = props.body.weekStartDateFrom;
    }
    if (props.body.weekStartDateTo !== undefined) {
      weekStartFilter.lte = props.body.weekStartDateTo;
    }
    where.week_start_date = weekStartFilter;
  }
  if (
    props.body.weekEndDateFrom !== undefined ||
    props.body.weekEndDateTo !== undefined
  ) {
    const weekEndFilter: {
      gte?: string;
      lte?: string;
    } = {};
    if (props.body.weekEndDateFrom !== undefined) {
      weekEndFilter.gte = props.body.weekEndDateFrom;
    }
    if (props.body.weekEndDateTo !== undefined) {
      weekEndFilter.lte = props.body.weekEndDateTo;
    }
    where.week_end_date = weekEndFilter;
  }
  if (
    props.body.submittedAtFrom !== undefined ||
    props.body.submittedAtTo !== undefined
  ) {
    const submittedFilter: {
      gte?: string;
      lte?: string;
    } = {};
    if (props.body.submittedAtFrom !== undefined) {
      submittedFilter.gte = props.body.submittedAtFrom;
    }
    if (props.body.submittedAtTo !== undefined) {
      submittedFilter.lte = props.body.submittedAtTo;
    }
    where.submitted_at = submittedFilter;
  }
  if (
    props.body.reviewedAtFrom !== undefined ||
    props.body.reviewedAtTo !== undefined
  ) {
    const reviewedFilter: {
      gte?: string;
      lte?: string;
    } = {};
    if (props.body.reviewedAtFrom !== undefined) {
      reviewedFilter.gte = props.body.reviewedAtFrom;
    }
    if (props.body.reviewedAtTo !== undefined) {
      reviewedFilter.lte = props.body.reviewedAtTo;
    }
    where.reviewed_at = reviewedFilter;
  }
  const data = await MyGlobal.prisma.erp_hrm_timesheets.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ week_start_date: "desc" }, { status: "asc" }],
    ...ErpHrmTimesheetAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_timesheets.count({ where });
  const transformed = await ArrayUtil.asyncMap(
    data,
    ErpHrmTimesheetAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
