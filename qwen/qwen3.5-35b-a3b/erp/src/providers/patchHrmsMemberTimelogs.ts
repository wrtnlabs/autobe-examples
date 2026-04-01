import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimelog";
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

export async function patchHrmsMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmsTimelog.IRequest;
}): Promise<IPageIHrmsTimelog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const rawOrganizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!rawOrganizationMember) {
    throw new HttpException("No member record found", 404);
  }
  const organizationMember = rawOrganizationMember as unknown as {
    id: string;
    hrms_member_id: string;
    employees: Array<{
      id: string;
    }>;
    role: {
      permissions: Array<{
        permission: string;
      }>;
    };
  };
  if (organizationMember.employees.length === 0) {
    throw new HttpException("No employee record found", 404);
  }
  const employee = organizationMember.employees[0];
  const hasTimeViewAll = organizationMember.role.permissions.some(
    (p: { permission: string }) => p.permission === "time:view_all",
  );
  const dateRangeWhere: Prisma.hrms_timelogsWhereInput = {
    deleted_at: null,
    ...(props.body.date_range && {
      date: {
        gte: new Date(props.body.date_range.start_date),
        lte: new Date(props.body.date_range.end_date),
      },
    }),
    ...(hasTimeViewAll ? {} : { employee_id: employee.id }),
  };
  const [timelogs, total] = await Promise.all([
    MyGlobal.prisma.hrms_timelogs.findMany({
      where: dateRangeWhere,
      skip,
      take: limit,
      orderBy: { date: "desc" },
      select: {
        id: true,
        employee_id: true,
        project_id: true,
        task_id: true,
        billable: true,
        created_at: true,
        date: true,
        description: true,
        duration_minutes: true,
        updated_at: true,
        employee: { select: { display_name: true } },
        project: { select: { name: true } },
        task: { select: { title: true } },
      },
    }),
    MyGlobal.prisma.hrms_timelogs.count({ where: dateRangeWhere }),
  ]);
  const data = timelogs.map(
    (t) =>
      ({
        group_id: t.id as string & tags.Format<"uuid">,
        group_name: t.employee.display_name,
        total_hours: t.duration_minutes / 60,
        billable_hours: t.billable ? t.duration_minutes / 60 : 0,
        non_billable_hours: !t.billable ? t.duration_minutes / 60 : 0,
      }) satisfies IHrmsTimelog.ISummary,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
