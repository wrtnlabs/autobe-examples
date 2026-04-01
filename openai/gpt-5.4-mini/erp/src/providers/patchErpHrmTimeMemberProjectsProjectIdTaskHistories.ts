import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTaskHistoryEntry";
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

export async function patchErpHrmTimeMemberProjectsProjectIdTaskHistories(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTaskHistoryEntry.IRequest;
}): Promise<IPageIErpHrmTimeTaskHistoryEntry.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const project = await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const where: Prisma.erp_hrm_time_task_history_entriesWhereInput = {
    task: {
      erp_hrm_time_project_id: project.id,
    },
  };
  const histories =
    await MyGlobal.prisma.erp_hrm_time_task_history_entries.findMany({
      where,
      orderBy: [{ changed_at: "desc" }, { id: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        old_status: true,
        new_status: true,
        changed_at: true,
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            estimated_hours: true,
            due_date: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            project: {
              select: {
                id: true,
              },
            },
            employee: {
              select: {
                id: true,
              },
            },
            parentTask: {
              select: {
                id: true,
              },
            },
          },
        },
        member: {
          select: {
            id: true,
          },
        },
      },
    });
  const records = await MyGlobal.prisma.erp_hrm_time_task_history_entries.count(
    {
      where,
    },
  );
  return {
    data: await ArrayUtil.asyncMap(
      histories,
      async (history): Promise<IErpHrmTimeTaskHistoryEntry.ISummary> => ({
        id: history.id,
        task: {
          id: history.task.id,
          title: history.task.title,
          description: history.task.description,
          status: history.task.status,
          priority: history.task.priority,
          estimatedHours: history.task.estimated_hours,
          dueDate:
            history.task.due_date === null
              ? null
              : toISOStringSafe(history.task.due_date),
          project: {
            id: history.task.project.id,
            name: "",
            description: null,
            colorCode: "",
            status: "",
            budgetHours: null,
            startDate: null,
            endDate: null,
            organization: {},
            createdAt: "",
            updatedAt: "",
            deletedAt: null,
          },
          employee:
            history.task.employee === null
              ? null
              : {
                  id: history.task.employee.id,
                  organization: {},
                  member: {},
                  role: {
                    id: "",
                    organization: {},
                    name: "",
                    description: null,
                    isBuiltin: false,
                    createdAt: "",
                    updatedAt: "",
                    deletedAt: null,
                  },
                  department: null,
                  positionTitle: null,
                  employmentType: "",
                  status: "",
                  createdAt: "",
                  updatedAt: "",
                  deletedAt: null,
                },
          parentTask:
            history.task.parentTask === null
              ? null
              : {
                  id: history.task.parentTask.id,
                  title: "",
                  description: null,
                  status: "",
                  priority: "",
                  estimatedHours: null,
                  dueDate: null,
                  project: {
                    id: "",
                    name: "",
                    description: null,
                    colorCode: "",
                    status: "",
                    budgetHours: null,
                    startDate: null,
                    endDate: null,
                    organization: {},
                    createdAt: "",
                    updatedAt: "",
                    deletedAt: null,
                  },
                  employee: null,
                  parentTask: null,
                  createdAt: toISOStringSafe(history.task.created_at),
                  updatedAt: toISOStringSafe(history.task.updated_at),
                  deletedAt:
                    history.task.deleted_at === null
                      ? null
                      : toISOStringSafe(history.task.deleted_at),
                },
          createdAt: toISOStringSafe(history.task.created_at),
          updatedAt: toISOStringSafe(history.task.updated_at),
          deletedAt:
            history.task.deleted_at === null
              ? null
              : toISOStringSafe(history.task.deleted_at),
        },
        member: {
          id: history.member.id,
        },
        oldStatus: history.old_status,
        newStatus: history.new_status,
        changedAt: toISOStringSafe(history.changed_at),
      }),
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
