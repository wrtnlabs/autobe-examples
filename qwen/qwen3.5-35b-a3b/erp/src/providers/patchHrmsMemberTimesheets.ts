import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmsTimesheet.IRequest;
}): Promise<IPageIHrmsTimesheet.ISummary> {
  // Parse and validate date range
  const startDate: string & tags.Format<"date"> = props.body.start_date;
  const endDate: string & tags.Format<"date"> = props.body.end_date;
  // Validate date order
  if (startDate > endDate) {
    throw new HttpException("Start date must be on or before end date", 400);
  }
  // Validate and normalize pagination parameters
  const page: number & tags.Type<"int32"> & tags.Minimum<1> = (props.body
    .page ?? 1) as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit: (number & tags.Type<"int32"> & tags.Minimum<0>) | null = (props
    .body.limit ?? 100) as
    | (number & tags.Type<"int32"> & tags.Minimum<0>)
    | null;
  const effectiveLimit: number =
    limit === null || limit === undefined
      ? 100
      : limit > 100
        ? 100
        : limit < 1
          ? 1
          : limit;
  // Verify member's organization membership
  const orgMember = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      hrms_organization_id: props.body.organization_id,
      deleted_at: null,
    },
  });
  if (!orgMember) {
    throw new HttpException("Not a member of the specified organization", 403);
  }
  // Build employee_id filter
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: orgMember.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException(
      "Employee record not found for this organization membership",
      404,
    );
  }
  const timesheetEmployeeIdFilter = employee.id;
  // Build timesheet query filters
  const timesheetWeekStartStartDate: string & tags.Format<"date"> = startDate;
  const timesheetWeekStartEndDate: string & tags.Format<"date"> = endDate;
  const timesheetsWhereInput: Prisma.hrms_timesheetsWhereInput = {
    deleted_at: null,
    week_start_date: {
      gte: new Date(`${timesheetWeekStartStartDate}T00:00:00Z`),
      lte: new Date(`${timesheetWeekStartEndDate}T23:59:59Z`),
    },
    hrms_employee_id: timesheetEmployeeIdFilter,
  } satisfies Prisma.hrms_timesheetsWhereInput;
  // Execute queries
  const [timesheets, totalCount] = await Promise.all([
    MyGlobal.prisma.hrms_timesheets.findMany({
      where: timesheetsWhereInput,
      include: {
        employee: {
          select: {
            id: true,
            display_name: true,
            position: true,
            department_id: true,
            status: true,
            _count: {
              select: {
                timelogs: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_uri: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
      orderBy: [{ week_start_date: "desc" }, { id: "desc" }],
      skip: (page - 1) * effectiveLimit,
      take: effectiveLimit,
    }),
    MyGlobal.prisma.hrms_timesheets.count({
      where: timesheetsWhereInput,
    }),
  ]);
  // Transform timesheets to response format
  const data: IHrmsTimesheet.ISummary[] = await ArrayUtil.asyncMap(
    timesheets,
    async (timesheet) => {
      const employeeData = timesheet.employee;
      const reviewerData = timesheet.reviewer;
      return {
        project_id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        project_name: "",
        budget_hours: 0,
        actual_hours: 0,
        progress: 0,
        utilization_percentage: 0,
        utilization_flag: false,
        id: timesheet.id as string & tags.Format<"uuid">,
        employee: {
          id: employeeData.id as string & tags.Format<"uuid">,
          display_name: employeeData.display_name,
          position: employeeData.position ?? undefined,
          department_id:
            employeeData.department_id ??
            ("00000000-0000-0000-0000-000000000000" as string &
              tags.Format<"uuid">),
          status: employeeData.status,
          total_hours_logged: 0,
          timelog_count: employeeData._count.timelogs,
          timesheets_submitted: 0,
          timesheets_approved: 0,
          timesheets_pending: 0,
        },
        reviewer:
          reviewerData !== null && reviewerData !== undefined
            ? {
                id: reviewerData.id as string & tags.Format<"uuid">,
                email: reviewerData.email,
                display_name: reviewerData.display_name,
                avatar_uri: reviewerData.avatar_uri ?? null,
                phone_number: reviewerData.phone_number ?? null,
                organization_membership_count: 0,
                created_at: toISOStringSafe(reviewerData.created_at),
                updated_at: toISOStringSafe(reviewerData.updated_at),
                deleted_at:
                  reviewerData.deleted_at !== null &&
                  reviewerData.deleted_at !== undefined
                    ? toISOStringSafe(reviewerData.deleted_at)
                    : null,
              }
            : null,
        timelogs: [],
        week_start_date: toISOStringSafe(timesheet.week_start_date),
        week_end_date: toISOStringSafe(timesheet.week_end_date),
        status: timesheet.status,
        total_hours: Number(timesheet.total_hours),
        submitted_at:
          timesheet.submitted_at !== null &&
          timesheet.submitted_at !== undefined
            ? toISOStringSafe(timesheet.submitted_at)
            : undefined,
        reviewed_at:
          timesheet.reviewed_at !== null && timesheet.reviewed_at !== undefined
            ? toISOStringSafe(timesheet.reviewed_at)
            : undefined,
        rejection_reason: timesheet.rejection_reason,
        created_at: toISOStringSafe(timesheet.created_at),
        updated_at: toISOStringSafe(timesheet.updated_at),
        deleted_at:
          timesheet.deleted_at !== null && timesheet.deleted_at !== undefined
            ? toISOStringSafe(timesheet.deleted_at)
            : null,
      };
    },
  );
  const paginationData: IPage.IPagination = {
    current: page,
    limit: effectiveLimit,
    records: totalCount,
    pages: Math.ceil(totalCount / effectiveLimit),
  };
  return {
    pagination: paginationData,
    data,
  };
}
