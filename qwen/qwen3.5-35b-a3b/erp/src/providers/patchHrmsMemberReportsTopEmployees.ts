import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTopEmployee";
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

export async function patchHrmsMemberReportsTopEmployees(props: {
  member: MemberPayload;
  body: IHrmsTopEmployee.IRequest;
}): Promise<IPageIHrmsTopEmployee.ISummary> {
  const member = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: { id: props.member.id, deleted_at: null },
  });
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        hrms_member_id: member.id,
        deleted_at: null,
      },
    });
  const role = await MyGlobal.prisma.hrms_organization_roles.findFirstOrThrow({
    where: {
      id: organizationMember.hrms_organization_role_id,
    },
  });
  const hasReportPermission =
    role.is_builtin || role.name === "Owner" || role.name === "Manager";
  if (!hasReportPermission) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 5;
  const skip = (page - 1) * limit;
  const startDate = props.body.dateRange.startDate
    ? new Date(props.body.dateRange.startDate + "T00:00:00Z")
    : new Date(new Date().setDate(new Date().getDate() - new Date().getDay()));
  const endDate = props.body.dateRange.endDate
    ? new Date(props.body.dateRange.endDate + "T23:59:59Z")
    : new Date(
        new Date().setDate(new Date().getDate() + (6 - new Date().getDay())),
      );
  const [employees, total] = await Promise.all([
    MyGlobal.prisma.$queryRaw<
      Array<{
        employee_id: string;
        display_name: string;
        position: string | null;
        department_id: string | null;
        total_hours: number;
        billable_hours: number;
        project_count: number;
        task_count: number;
      }>
    >`
      SELECT
        e.id AS employee_id,
        e.display_name,
        e.position,
        e.department_id,
        SUM(COALESCE(t.duration_minutes, 0)) AS total_hours,
        SUM(CASE WHEN t.billable THEN t.duration_minutes ELSE 0 END) AS billable_hours,
        COUNT(DISTINCT t.project_id) AS project_count,
        COUNT(DISTINCT t.task_id) AS task_count
      FROM hrms_employees e
      INNER JOIN hrms_timelogs t ON e.id = t.employee_id
      WHERE
        e.deleted_at IS NULL
        AND e.status = 'active'
        AND t.deleted_at IS NULL
        AND t.date >= ${startDate}
        AND t.date <= ${endDate}
        ${props.body.employeeId ? `AND t.employee_id = ${props.body.employeeId}` : ""}
        ${props.body.projectId ? `AND t.project_id = ${props.body.projectId}` : ""}
      GROUP BY e.id, e.display_name, e.position, e.department_id
      ORDER BY ${props.body.sort === "billable_hours" ? "billable_hours" : props.body.sort === "employee_name" ? "e.display_name" : props.body.sort === "department" ? "e.department_id" : "total_hours"} DESC
      LIMIT ${limit}
      OFFSET ${skip}
    `,
    MyGlobal.prisma.$queryRaw<Array<number>>`
        SELECT COUNT(*)::int
        FROM hrms_employees e
        INNER JOIN hrms_timelogs t ON e.id = t.employee_id
        WHERE
          e.deleted_at IS NULL
          AND e.status = 'active'
          AND t.deleted_at IS NULL
          AND t.date >= ${startDate}
          AND t.date <= ${endDate}
          ${props.body.employeeId ? `AND t.employee_id = ${props.body.employeeId}` : ""}
          ${props.body.projectId ? `AND t.project_id = ${props.body.projectId}` : ""}
      `,
  ]);
  const totalRecords = total[0] ?? 0;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    } satisfies IPage.IPagination,
    data: employees.map((e) => ({
      id: e.employee_id as string & tags.Format<"uuid">,
      display_name: e.display_name,
      position: e.position ?? "",
      department_id: e.department_id,
      total_hours: e.total_hours,
      billable_hours: e.billable_hours,
      project_count: e.project_count,
      task_count: e.task_count,
    })),
  };
}
