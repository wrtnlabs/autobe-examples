import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingReportCollector } from "../collectors/HrmTimeTrackingReportCollector";
import { HrmTimeTrackingReportTransformer } from "../transformers/HrmTimeTrackingReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingReports(props: {
  body: IHrmTimeTrackingReport.ICreate;
}): Promise<IHrmTimeTrackingReport> {
  const getSession = Reflect.get(MyGlobal, "session");
  if (typeof getSession !== "function") {
    throw new HttpException("Unauthorized", 401);
  }
  const sessionResult: unknown = await getSession();
  if (typeof sessionResult !== "object" || sessionResult === null) {
    throw new HttpException("Unauthorized", 401);
  }
  const sessionRecord = sessionResult as Record<string, unknown>;
  const organizationValue: unknown = sessionRecord.organization;
  if (typeof organizationValue !== "object" || organizationValue === null) {
    throw new HttpException("Unauthorized", 401);
  }
  const organizationRecord = organizationValue as Record<string, unknown>;
  const organizationId: unknown = organizationRecord.id;
  if (typeof organizationId !== "string" || organizationId.length === 0) {
    throw new HttpException("Unauthorized", 401);
  }
  const actorValue: unknown = sessionRecord.actor;
  if (typeof actorValue !== "object" || actorValue === null) {
    throw new HttpException("Unauthorized", 401);
  }
  const actorRecord = actorValue as Record<string, unknown>;
  const actorType: unknown = actorRecord.type;
  const permissionsValue: unknown = sessionRecord.permissions;
  const permissions: string[] = Array.isArray(permissionsValue)
    ? permissionsValue.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  if (actorType !== "owner" && permissions.includes("report:view") === false) {
    throw new HttpException("Forbidden", 403);
  }
  const supportedReportTypes: ReadonlySet<string> = new Set([
    "time_report",
    "project_budget_report",
    "weekly_summary_report",
  ]);
  if (supportedReportTypes.has(props.body.reportType) === false) {
    throw new HttpException("Invalid report type", 400);
  }
  if (
    props.body.rangeStartDate !== undefined &&
    props.body.rangeStartDate !== null &&
    props.body.rangeEndDate !== undefined &&
    props.body.rangeEndDate !== null &&
    props.body.rangeStartDate > props.body.rangeEndDate
  ) {
    throw new HttpException("Invalid date range", 400);
  }
  const allowedGroupByMap: Readonly<Record<string, ReadonlySet<string>>> = {
    time_report: new Set(["employee", "project", "task"]),
    project_budget_report: new Set(["project"]),
    weekly_summary_report: new Set(["week"]),
  };
  if (
    props.body.groupBy !== undefined &&
    props.body.groupBy !== null &&
    allowedGroupByMap[props.body.reportType].has(props.body.groupBy) === false
  ) {
    throw new HttpException("Invalid grouping for report type", 400);
  }
  if (
    props.body.reportType !== "time_report" &&
    ((props.body.billableOnly !== undefined &&
      props.body.billableOnly !== null) ||
      (props.body.includeNonBillable !== undefined &&
        props.body.includeNonBillable !== null))
  ) {
    throw new HttpException(
      "Billable filters are only supported for time reports",
      400,
    );
  }
  const employeeFilterBodies: IHrmTimeTrackingReportEmployeeFilter.ICreate[] =
    props.body.employeeFilters ?? [];
  const employeeIds: string[] = employeeFilterBodies.map(
    (filter) => filter.hrm_time_tracking_employee_id,
  );
  const uniqueEmployeeIds: string[] = Array.from(new Set(employeeIds));
  if (uniqueEmployeeIds.length !== employeeIds.length) {
    throw new HttpException("Duplicate employee filters", 400);
  }
  const projectFilterBodies: IHrmTimeTrackingReportProjectFilter.ICreate[] =
    props.body.projectFilters ?? [];
  const projectIds: string[] = projectFilterBodies.flatMap(
    (filter) => filter.projectIds,
  );
  const uniqueProjectIds: string[] = Array.from(new Set(projectIds));
  if (uniqueProjectIds.length !== projectIds.length) {
    throw new HttpException("Duplicate project filters", 400);
  }
  const taskFilterBodies: IHrmTimeTrackingReportTaskFilter.ICreate[] =
    props.body.taskFilters ?? [];
  const taskIds: string[] = taskFilterBodies.map((filter) => filter.task_id);
  const uniqueTaskIds: string[] = Array.from(new Set(taskIds));
  if (uniqueTaskIds.length !== taskIds.length) {
    throw new HttpException("Duplicate task filters", 400);
  }
  const organizationEntity: IEntity = {
    id: organizationId,
  };
  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      const duplicate = await tx.hrm_time_tracking_reports.findFirst({
        where: {
          hrm_time_tracking_organization_id: organizationId,
          name: props.body.name,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
      if (duplicate !== null) {
        throw new HttpException("Report name already exists", 409);
      }
      if (uniqueEmployeeIds.length !== 0) {
        const organizationCount =
          await tx.hrm_time_tracking_organizations.count({
            where: {
              id: organizationId,
            },
          });
        const employeeCount = await tx.hrm_time_tracking_employees.count({
          where: {
            id: {
              in: uniqueEmployeeIds,
            },
          },
        });
        if (
          organizationCount === 0 ||
          employeeCount !== uniqueEmployeeIds.length
        ) {
          throw new HttpException("Invalid employee filter scope", 400);
        }
      }
      if (uniqueProjectIds.length !== 0) {
        const projectCount = await tx.hrm_time_tracking_projects.count({
          where: {
            id: {
              in: uniqueProjectIds,
            },
            hrm_time_tracking_organization_id: organizationId,
          },
        });
        if (projectCount !== uniqueProjectIds.length) {
          throw new HttpException("Invalid project filter scope", 400);
        }
      }
      if (uniqueTaskIds.length !== 0) {
        const taskCount = await tx.hrm_time_tracking_tasks.count({
          where: {
            id: {
              in: uniqueTaskIds,
            },
            project: {
              hrm_time_tracking_organization_id: organizationId,
            },
          },
        });
        if (taskCount !== uniqueTaskIds.length) {
          throw new HttpException("Invalid task filter scope", 400);
        }
      }
      const createdReportData = await HrmTimeTrackingReportCollector.collect({
        body: {
          name: props.body.name,
          reportType: props.body.reportType,
          rangeStartDate: props.body.rangeStartDate ?? null,
          rangeEndDate: props.body.rangeEndDate ?? null,
          groupBy: props.body.groupBy ?? null,
          billableOnly:
            props.body.reportType === "time_report"
              ? (props.body.billableOnly ?? null)
              : null,
          includeNonBillable:
            props.body.reportType === "time_report"
              ? (props.body.includeNonBillable ?? null)
              : null,
          employeeFilters:
            uniqueEmployeeIds.length === 0
              ? undefined
              : uniqueEmployeeIds.map((id) => ({
                  hrm_time_tracking_employee_id: id,
                })),
          projectFilters:
            uniqueProjectIds.length === 0
              ? undefined
              : [
                  {
                    projectIds: uniqueProjectIds,
                  },
                ],
          taskFilters:
            uniqueTaskIds.length === 0
              ? undefined
              : uniqueTaskIds.map((id) => ({
                  task_id: id,
                })),
        },
        hrmTimeTrackingOrganizations: organizationEntity,
      });
      await tx.hrm_time_tracking_reports.create({
        data: createdReportData,
      });
      return await tx.hrm_time_tracking_reports.findUniqueOrThrow({
        where: {
          id: createdReportData.id,
        },
        ...HrmTimeTrackingReportTransformer.select(),
      });
    });
    return await HrmTimeTrackingReportTransformer.transform(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Report name already exists", 409);
    }
    throw error;
  }
}
