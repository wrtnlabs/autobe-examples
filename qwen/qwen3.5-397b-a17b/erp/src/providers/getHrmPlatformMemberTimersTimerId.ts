import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
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

export async function getHrmPlatformMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimer> {
  const timer = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
    where: {
      id: props.timerId,
      deleted_at: null,
    },
    select: {
      id: true,
      started_at: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      employee: {
        select: {
          id: true,
          user_id: true,
          role_id: true,
          department_id: true,
          position: true,
          employment_type: true,
          status: true,
          created_at: true,
          user: {
            select: {
              id: true,
              display_name: true,
              avatar_image: true,
              phone_number: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              description: true,
              is_builtin: true,
              organization_id: true,
              created_at: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              description: true,
              parent_department_id: true,
              created_at: true,
              deleted_at: true,
            },
          },
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          color_code: true,
          status: true,
          budget_hours: true,
          start_date: true,
          end_date: true,
          created_at: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          due_date: true,
          estimated_hours: true,
          hrm_platform_employee_id: true,
          parent_task_id: true,
          hrm_platform_project_id: true,
          created_at: true,
        },
      },
    },
  });
  if (timer.employee.user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: timer.id,
    employee: {
      id: timer.employee.id,
      user: {
        id: timer.employee.user.id,
        display_name: timer.employee.user.display_name,
        avatar_image: timer.employee.user.avatar_image ?? null,
        phone_number: timer.employee.user.phone_number ?? null,
      } satisfies IHrmPlatformMember.ISummary,
      role: {
        id: timer.employee.role.id,
        name: timer.employee.role.name,
        description: timer.employee.role.description ?? null,
        is_builtin: timer.employee.role.is_builtin,
        organization: {
          id: timer.employee.role.organization_id,
          name: "",
          currency: "",
          timezone: "",
        } satisfies IHrmPlatformOrganization.ISummary,
        created_at: timer.employee.role.created_at.toISOString(),
      } satisfies IHrmPlatformRole.ISummary,
      department:
        timer.employee.department_id !== null && timer.employee.department
          ? ({
              id: timer.employee.department.id,
              name: timer.employee.department.name,
              description: timer.employee.department.description ?? null,
              parent: null,
              created_at: timer.employee.department.created_at.toISOString(),
              deleted_at:
                timer.employee.department.deleted_at?.toISOString() ?? null,
            } satisfies IHrmPlatformDepartment.ISummary)
          : null,
      position: timer.employee.position ?? null,
      employment_type: timer.employee.employment_type,
      status: timer.employee.status,
      created_at: timer.employee.created_at.toISOString(),
    } satisfies IHrmPlatformEmployee.ISummary,
    project: {
      id: timer.project.id,
      name: timer.project.name,
      color_code: timer.project.color_code,
      status: timer.project.status,
      budget_hours: timer.project.budget_hours ?? null,
      start_date: timer.project.start_date?.toISOString() ?? null,
      end_date: timer.project.end_date?.toISOString() ?? null,
      created_at: timer.project.created_at.toISOString(),
    } satisfies IHrmPlatformProject.ISummary,
    task:
      timer.task !== null
        ? ({
            id: timer.task.id,
            title: timer.task.title,
            status: timer.task.status,
            priority: timer.task.priority,
            due_date: timer.task.due_date?.toISOString() ?? null,
            estimated_hours: timer.task.estimated_hours ?? null,
            assignee:
              timer.task.hrm_platform_employee_id !== null
                ? ({
                    id: "",
                    user: {
                      id: "",
                      display_name: "",
                      avatar_image: null,
                      phone_number: null,
                    } satisfies IHrmPlatformMember.ISummary,
                    role: {
                      id: "",
                      name: "",
                      is_builtin: false,
                      organization: {
                        id: "",
                        name: "",
                        currency: "",
                        timezone: "",
                      } satisfies IHrmPlatformOrganization.ISummary,
                      created_at: "" as string & tags.Format<"date-time">,
                    } satisfies IHrmPlatformRole.ISummary,
                    department: null,
                    position: null,
                    employment_type: "",
                    status: "",
                    created_at: "" as string & tags.Format<"date-time">,
                  } satisfies IHrmPlatformEmployee.ISummary)
                : null,
            parentTask:
              timer.task.parent_task_id !== null
                ? ({
                    id: "",
                    title: "",
                    status: "",
                    priority: "",
                    project: {
                      id: "",
                      name: "",
                      color_code: "",
                      status: "",
                      created_at: "" as string & tags.Format<"date-time">,
                    } satisfies IHrmPlatformProject.ISummary,
                    created_at: "" as string & tags.Format<"date-time">,
                  } satisfies IHrmPlatformTask.ISummary)
                : null,
            project: {
              id: timer.task.hrm_platform_project_id,
              name: "",
              color_code: "",
              status: "",
              created_at: "" as string & tags.Format<"date-time">,
            } satisfies IHrmPlatformProject.ISummary,
            created_at: timer.task.created_at.toISOString(),
          } satisfies IHrmPlatformTask.ISummary)
        : null,
    started_at: timer.started_at.toISOString(),
    description: timer.description ?? null,
    created_at: timer.created_at.toISOString(),
    updated_at: timer.updated_at.toISOString(),
    deleted_at: timer.deleted_at?.toISOString() ?? null,
  } satisfies IHrmPlatformTimer;
}
