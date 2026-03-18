import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingReportsReportIdTaskFiltersTaskFilterId(props: {
  reportId: string & tags.Format<"uuid">;
  taskFilterId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingReportTaskFilter.IUpdate;
}): Promise<IHrmTimeTrackingReportTaskFilter> {
  const report =
    await MyGlobal.prisma.hrm_time_tracking_reports.findFirstOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
        name: true,
        report_type: true,
        range_start_date: true,
        range_end_date: true,
        group_by: true,
        billable_only: true,
        include_non_billable: true,
        created_at: true,
        updated_at: true,
      },
    });
  const taskFilter =
    await MyGlobal.prisma.hrm_time_tracking_report_task_filters.findFirstOrThrow(
      {
        where: {
          id: props.taskFilterId,
          deleted_at: null,
        },
        select: {
          id: true,
          hrm_time_tracking_report_id: true,
          hrm_time_tracking_task_id: true,
        },
      },
    );
  if (taskFilter.hrm_time_tracking_report_id !== report.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.hrm_time_tracking_task_id !== undefined) {
    const replacementTask =
      await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
        where: {
          id: props.body.hrm_time_tracking_task_id,
          deleted_at: null,
        },
        select: {
          id: true,
          project: {
            select: {
              hrm_time_tracking_organization_id: true,
            },
          },
        },
      });
    if (
      replacementTask.project.hrm_time_tracking_organization_id !==
      report.hrm_time_tracking_organization_id
    ) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const now = new Date();
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    if (
      props.body.hrm_time_tracking_task_id !== undefined &&
      props.body.hrm_time_tracking_task_id !==
        taskFilter.hrm_time_tracking_task_id
    ) {
      const duplicated =
        await tx.hrm_time_tracking_report_task_filters.findFirst({
          where: {
            hrm_time_tracking_report_id: report.id,
            hrm_time_tracking_task_id: props.body.hrm_time_tracking_task_id,
            deleted_at: null,
            id: {
              not: taskFilter.id,
            },
          },
          select: {
            id: true,
          },
        });
      if (duplicated !== null) {
        throw new HttpException(
          "Task filter already exists for this report",
          409,
        );
      }
    }
    return await tx.hrm_time_tracking_report_task_filters.update({
      where: {
        id: taskFilter.id,
      },
      data: {
        ...(props.body.hrm_time_tracking_task_id !== undefined
          ? {
              hrm_time_tracking_task_id: props.body.hrm_time_tracking_task_id,
            }
          : {}),
        updated_at: now,
      },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            estimated_hours: true,
            due_date: true,
            assignee: {
              select: {
                id: true,
                email: true,
                email_verified_at: true,
                last_logged_in_at: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            parent: {
              select: {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                estimated_hours: true,
                due_date: true,
                assignee: {
                  select: {
                    id: true,
                    email: true,
                    email_verified_at: true,
                    last_logged_in_at: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                parent: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    status: true,
                    priority: true,
                    estimated_hours: true,
                    due_date: true,
                    assignee: {
                      select: {
                        id: true,
                        email: true,
                        email_verified_at: true,
                        last_logged_in_at: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                      },
                    },
                    parent: false,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  });
  const mapEmployeeSummary = (employee: {
    id: string;
    email: string;
    email_verified_at: Date | null;
    last_logged_in_at: Date | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }): IHrmTimeTrackingEmployee.ISummary => ({
    id: employee.id,
    email: employee.email,
    email_verified_at: employee.email_verified_at?.toISOString() ?? null,
    last_logged_in_at: employee.last_logged_in_at?.toISOString() ?? null,
    created_at: employee.created_at.toISOString(),
    updated_at: employee.updated_at.toISOString(),
    deleted_at: employee.deleted_at?.toISOString() ?? null,
  });
  const mapThirdParentSummary = (task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    estimated_hours: number | null;
    due_date: Date | null;
    assignee: {
      id: string;
      email: string;
      email_verified_at: Date | null;
      last_logged_in_at: Date | null;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    } | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }): IHrmTimeTrackingTask.ISummary => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    estimated_hours: task.estimated_hours,
    due_date: task.due_date?.toISOString() ?? null,
    assignee: task.assignee === null ? null : mapEmployeeSummary(task.assignee),
    parent: null,
    created_at: task.created_at.toISOString(),
    updated_at: task.updated_at.toISOString(),
    deleted_at: task.deleted_at?.toISOString() ?? null,
  });
  const mapSecondParentSummary = (task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    estimated_hours: number | null;
    due_date: Date | null;
    assignee: {
      id: string;
      email: string;
      email_verified_at: Date | null;
      last_logged_in_at: Date | null;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    } | null;
    parent: {
      id: string;
      title: string;
      description: string | null;
      status: string;
      priority: string;
      estimated_hours: number | null;
      due_date: Date | null;
      assignee: {
        id: string;
        email: string;
        email_verified_at: Date | null;
        last_logged_in_at: Date | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
      } | null;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    } | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }): IHrmTimeTrackingTask.ISummary => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    estimated_hours: task.estimated_hours,
    due_date: task.due_date?.toISOString() ?? null,
    assignee: task.assignee === null ? null : mapEmployeeSummary(task.assignee),
    parent: task.parent === null ? null : mapThirdParentSummary(task.parent),
    created_at: task.created_at.toISOString(),
    updated_at: task.updated_at.toISOString(),
    deleted_at: task.deleted_at?.toISOString() ?? null,
  });
  const mapTaskSummary = (task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    estimated_hours: number | null;
    due_date: Date | null;
    assignee: {
      id: string;
      email: string;
      email_verified_at: Date | null;
      last_logged_in_at: Date | null;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    } | null;
    parent: {
      id: string;
      title: string;
      description: string | null;
      status: string;
      priority: string;
      estimated_hours: number | null;
      due_date: Date | null;
      assignee: {
        id: string;
        email: string;
        email_verified_at: Date | null;
        last_logged_in_at: Date | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
      } | null;
      parent: {
        id: string;
        title: string;
        description: string | null;
        status: string;
        priority: string;
        estimated_hours: number | null;
        due_date: Date | null;
        assignee: {
          id: string;
          email: string;
          email_verified_at: Date | null;
          last_logged_in_at: Date | null;
          created_at: Date;
          updated_at: Date;
          deleted_at: Date | null;
        } | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
      } | null;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    } | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }): IHrmTimeTrackingTask.ISummary => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    estimated_hours: task.estimated_hours,
    due_date: task.due_date?.toISOString() ?? null,
    assignee: task.assignee === null ? null : mapEmployeeSummary(task.assignee),
    parent: task.parent === null ? null : mapSecondParentSummary(task.parent),
    created_at: task.created_at.toISOString(),
    updated_at: task.updated_at.toISOString(),
    deleted_at: task.deleted_at?.toISOString() ?? null,
  });
  return {
    id: updated.id,
    report: {
      id: report.id,
      name: report.name,
      report_type: report.report_type,
      range_start_date: report.range_start_date?.toISOString() ?? null,
      range_end_date: report.range_end_date?.toISOString() ?? null,
      group_by: report.group_by,
      billable_only: report.billable_only,
      include_non_billable: report.include_non_billable,
      created_at: report.created_at.toISOString(),
      updated_at: report.updated_at.toISOString(),
    },
    task: mapTaskSummary(updated.task),
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
    deleted_at: updated.deleted_at?.toISOString() ?? null,
  };
}
