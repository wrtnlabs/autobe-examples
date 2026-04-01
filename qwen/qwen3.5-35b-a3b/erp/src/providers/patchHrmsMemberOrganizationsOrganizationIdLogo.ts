import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
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

export async function patchHrmsMemberOrganizationsOrganizationIdLogo(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsOrganization.IUpdateLogo;
}): Promise<IHrmsOrganization> {
  const organization = await MyGlobal.prisma.hrms_organizations.findFirst({
    where: { id: props.organizationId, deleted_at: null },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_organization_id: props.organizationId,
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  const role = await MyGlobal.prisma.hrms_organization_roles.findFirst({
    where: { id: organizationMember.hrms_organization_role_id },
  });
  if (role === null || (role.name !== "Owner" && role.name !== "Manager")) {
    throw new HttpException("Forbidden", 403);
  }
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const fileLower = props.body.file.toLowerCase();
  const hasValidExtension = allowedExtensions.some((ext) =>
    fileLower.endsWith(ext),
  );
  if (!hasValidExtension) {
    throw new HttpException(
      "Invalid file format. Allowed: JPEG, PNG, GIF, WebP",
      400,
    );
  }
  const oldLogo = await MyGlobal.prisma.hrms_files.findFirst({
    where: {
      organization_id: props.organizationId,
      file_category: "organization_logo",
      deleted_at: null,
    },
  });
  if (oldLogo !== null) {
    await MyGlobal.prisma.hrms_files.update({
      where: { id: oldLogo.id },
      data: { deleted_at: new Date() },
    });
  }
  const fileParts = props.body.file.split(";");
  const mimeType = fileParts[0]?.split(":")[1] || "image/jpeg";
  const fileName = props.body.file.split("/").pop() || "logo.png";
  const newFile = await MyGlobal.prisma.hrms_files.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      organization_id: props.organizationId,
      filename: fileName,
      storage_path: props.body.file,
      mime_type: mimeType,
      file_size: 1024,
      file_category: "organization_logo",
      owner_type: null,
      validation_status: "validated" as const,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.hrms_organizations.update({
    where: { id: props.organizationId },
    data: { logo_uri: newFile.storage_path, updated_at: new Date() },
  });
  const activeEmployees = await MyGlobal.prisma.hrms_employees.findMany({
    where: {
      organizationMember: {
        hrms_organization_id: props.organizationId,
      },
      status: "active",
      deleted_at: null,
    },
    select: { id: true, display_name: true },
  });
  const activeEmployeeIds = activeEmployees.map((e) => e.id);
  const totalActiveEmployees = activeEmployees.length;
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = toISOStringSafe(oneWeekAgo);
  const totalHoursResult = await MyGlobal.prisma.hrms_timelogs.aggregate({
    where: {
      employee_id: { in: activeEmployeeIds },
      date: { gte: oneWeekAgoStr },
      deleted_at: null,
    },
    _sum: { duration_minutes: true },
  });
  const totalHoursThisWeek =
    Math.round((totalHoursResult._sum?.duration_minutes || 0) / 6000) / 100;
  const pendingTimesheets = await MyGlobal.prisma.hrms_timesheets.findMany({
    where: {
      hrms_employee_id: { in: activeEmployeeIds },
      status: "submitted",
      deleted_at: null,
    },
  });
  const pendingTimesheetsCount = pendingTimesheets.length;
  const projectsWithBudget = await MyGlobal.prisma.hrms_projects.findMany({
    where: {
      hrms_organization_id: props.organizationId,
      budget_hours: { gt: 0 },
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      budget_hours: true,
      description: true,
      color_code: true,
      status: true,
      start_date: true,
      end_date: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      hrms_organization_id: true,
    },
  });
  const projectTimelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      employee_id: { in: activeEmployeeIds },
      project_id: { in: projectsWithBudget.map((p) => p.id) },
      date: { gte: oneWeekAgoStr },
      deleted_at: null,
    },
  });
  const projectHoursMap = new Map<string, number>();
  projectTimelogs.forEach((t) => {
    const hours = t.duration_minutes / 60;
    const current = projectHoursMap.get(t.project_id) || 0;
    projectHoursMap.set(t.project_id, current + hours);
  });
  const projectTaskCounts = await MyGlobal.prisma.hrms_tasks.findMany({
    where: {
      hrms_project_id: { in: projectsWithBudget.map((p) => p.id) },
      deleted_at: null,
    },
    select: {
      hrms_project_id: true,
      status: true,
    },
  });
  const projectTasksMap = new Map<
    string,
    {
      total: number;
      completed: number;
      pending: number;
      inProgress: number;
      closed: number;
    }
  >();
  projectsWithBudget.forEach((p) => {
    projectTasksMap.set(p.id, {
      total: 0,
      completed: 0,
      pending: 0,
      inProgress: 0,
      closed: 0,
    });
  });
  projectTaskCounts.forEach((t) => {
    const map = projectTasksMap.get(t.hrms_project_id);
    if (map) {
      map.total += 1;
      if (t.status === "completed") map.completed += 1;
      else if (t.status === "open" || t.status === "pending") map.pending += 1;
      else if (t.status === "in-progress") map.inProgress += 1;
      else if (t.status === "closed") map.closed += 1;
    }
  });
  const projectTimelogCounts = await MyGlobal.prisma.hrms_timelogs.groupBy({
    by: ["project_id"],
    where: {
      project_id: { in: projectsWithBudget.map((p) => p.id) },
      deleted_at: null,
    },
    _count: { id: true },
  });
  const projectTimelogCountMap = new Map<string, number>();
  projectTimelogCounts.forEach((c) => {
    projectTimelogCountMap.set(c.project_id, c._count.id);
  });
  const projectsOverBudget: IHrmsProject.ISummary[] = projectsWithBudget
    .map((project) => {
      const loggedHours = projectHoursMap.get(project.id) || 0;
      const budgetHours = project.budget_hours ?? 0;
      const utilizationPercentage =
        budgetHours > 0 ? (loggedHours / budgetHours) * 100 : 0;
      if (utilizationPercentage > 80) {
        const taskCounts = projectTasksMap.get(project.id) || {
          total: 0,
          completed: 0,
          pending: 0,
          inProgress: 0,
          closed: 0,
        };
        const timelogCount = projectTimelogCountMap.get(project.id) || 0;
        return {
          id: project.id,
          name: project.name,
          description: project.description ?? "",
          color_code: project.color_code ?? "",
          organization_id: project.hrms_organization_id,
          organization_name: organization.name,
          status: project.status as "active" | "archived" | "completed",
          budget_hours: project.budget_hours,
          start_date: project.start_date?.toISOString() ?? null,
          end_date: project.end_date?.toISOString() ?? null,
          planned_hours: budgetHours,
          actual_hours: loggedHours,
          budget_utilization_percentage: utilizationPercentage,
          total_tasks: taskCounts.total,
          pending_tasks: taskCounts.pending,
          in_progress_tasks: taskCounts.inProgress,
          completed_tasks: taskCounts.completed,
          closed_tasks: taskCounts.closed,
          timelog_count: timelogCount,
          created_at: project.created_at.toISOString(),
          updated_at: project.updated_at.toISOString(),
        } as IHrmsProject.ISummary;
      }
      return null;
    })
    .filter((r) => r !== null) as IHrmsProject.ISummary[];
  const rawTopEmployees: (IHrmsEmployee.ISummary | null)[] =
    await ArrayUtil.asyncMap(activeEmployees, async (employee) => {
      const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
        where: {
          employee_id: employee.id,
          date: { gte: oneWeekAgoStr },
          deleted_at: null,
        },
      });
      const hours = timelogs.reduce(
        (sum, t) => sum + t.duration_minutes / 60,
        0,
      );
      if (hours > 0) {
        const timesheets = await MyGlobal.prisma.hrms_timesheets.findMany({
          where: {
            hrms_employee_id: employee.id,
            deleted_at: null,
          },
          select: { status: true },
        });
        const submitted = timesheets.filter(
          (t) => t.status === "submitted",
        ).length;
        const approved = timesheets.filter(
          (t) => t.status === "approved",
        ).length;
        const pending = timesheets.filter((t) => t.status === "draft").length;
        const employeeRecord = await MyGlobal.prisma.hrms_employees.findFirst({
          where: { id: employee.id },
          select: { position: true, department_id: true, status: true },
        });
        return {
          id: employee.id,
          display_name: employee.display_name,
          position: employeeRecord?.position ?? undefined,
          department_id:
            employeeRecord?.department_id ??
            ("" as string & tags.Format<"uuid">),
          total_hours_logged: hours,
          timelog_count: timelogs.length as number & tags.Type<"int32">,
          timesheets_submitted: submitted as number & tags.Type<"int32">,
          timesheets_approved: approved as number & tags.Type<"int32">,
          timesheets_pending: pending as number & tags.Type<"int32">,
          status: employeeRecord?.status ?? "",
        } satisfies IHrmsEmployee.ISummary;
      }
      return null;
    });
  const topEmployees = rawTopEmployees.filter(
    (e): e is IHrmsEmployee.ISummary => e !== null,
  );
  return {
    totalActiveEmployees,
    totalHoursThisWeek,
    pendingTimesheetsCount,
    projectsOverBudget,
    topEmployees,
    generatedAt: toISOStringSafe(new Date()),
  } satisfies IHrmsOrganization;
}
