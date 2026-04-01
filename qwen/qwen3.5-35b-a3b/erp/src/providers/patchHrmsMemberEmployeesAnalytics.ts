import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsEmployee";
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

export async function patchHrmsMemberEmployeesAnalytics(props: {
  member: MemberPayload;
  body: IHrmsEmployee.IRequest;
}): Promise<IPageIHrmsEmployee.ISummary> {
  const page = props.body.page ?? 1;
  const limit = (props.body.limit ?? props.body.page_size ?? 20) as number;
  const skip = (page - 1) * limit;
  const member = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: { id: props.member.id, deleted_at: null },
  });
  const orgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
    });
  const organizationId = orgMember.hrms_organization_id;
  const startDate = props.body.start_date
    ? new Date(props.body.start_date)
    : (() => {
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(monday.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        return monday;
      })();
  const endDate = props.body.end_date
    ? new Date(props.body.end_date)
    : (() => {
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? 0 : 6 - day;
        const sunday = new Date(now);
        sunday.setDate(sunday.getDate() + diff);
        sunday.setHours(23, 59, 59, 999);
        return sunday;
      })();
  const whereInput: Prisma.hrms_employeesWhereInput = {
    organizationMember: {
      hrms_organization_id: organizationId,
      deleted_at: null,
    },
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.department_id && {
      department_id: props.body.department_id,
    }),
    ...(props.body.search
      ? {
          OR: [
            {
              display_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            { position: { contains: props.body.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [rawData, total] = await Promise.all([
    MyGlobal.prisma.hrms_employees.findMany({
      where: whereInput,
      skip,
      take: limit,
      include: {
        department: true,
        timelogs: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
            deleted_at: null,
          },
          select: { duration_minutes: true, date: true },
        },
        timesheets: {
          where: {
            week_start_date: {
              gte: startDate,
              lte: endDate,
            },
            deleted_at: null,
          },
          select: { status: true },
        },
      },
      orderBy: (() => {
        const sort = props.body.sort ?? "employee_name";
        const order = props.body.order ?? "asc";
        switch (sort) {
          case "total_hours":
            return {
              timelogs: { _sum: { duration_minutes: "desc" } },
            } as Prisma.hrms_employeesOrderByWithRelationInput;
          case "last_activity_date":
            return {
              timelogs: { date: order },
            } as Prisma.hrms_employeesOrderByWithRelationInput;
          case "status":
            return { status: order };
          default:
            return { display_name: "asc" };
        }
      })(),
    }),
    MyGlobal.prisma.hrms_employees.count({
      where: whereInput,
    }),
  ]);
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  const transformedData = await ArrayUtil.asyncMap(rawData, async (emp) => {
    const empWithRelations = emp as typeof emp & {
      timelogs: Array<{
        duration_minutes: number | null;
        date: Date;
      }>;
      timesheets: Array<{
        status: string;
      }>;
    };
    const totalHoursLogged = empWithRelations.timelogs.reduce(
      (sum: number, t) => sum + (t.duration_minutes ?? 0),
      0,
    );
    const timesheetsSubmitted = empWithRelations.timesheets.filter(
      (t) => t.status === "submitted",
    ).length;
    const timesheetsApproved = empWithRelations.timesheets.filter(
      (t) => t.status === "approved",
    ).length;
    const timesheetsPending = empWithRelations.timesheets.filter(
      (t) => t.status === "draft",
    ).length;
    return {
      id: (empWithRelations.id ?? "") satisfies string as string,
      display_name: empWithRelations.display_name,
      position: empWithRelations.position ?? undefined,
      department_id: (empWithRelations.department_id ??
        "") satisfies string as string,
      total_hours_logged: totalHoursLogged,
      timelog_count: empWithRelations.timelogs
        .length satisfies number as number,
      timesheets_submitted: timesheetsSubmitted satisfies number as number,
      timesheets_approved: timesheetsApproved satisfies number as number,
      timesheets_pending: timesheetsPending satisfies number as number,
      status: empWithRelations.status,
    } satisfies IHrmsEmployee.ISummary;
  });
  return {
    pagination,
    data: transformedData,
  } satisfies IPageIHrmsEmployee.ISummary;
}
