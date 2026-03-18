import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingTaskCollector } from "../collectors/HrmTimeTrackingTaskCollector";
import { HrmTimeTrackingTaskTransformer } from "../transformers/HrmTimeTrackingTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingProjectsProjectIdTasks(props: {
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTask.ICreate;
}): Promise<IHrmTimeTrackingTask> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const project = await prisma.hrm_time_tracking_projects.findUniqueOrThrow({
      where: {
        id: props.projectId,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
    if (project.deleted_at !== null) {
      throw new HttpException("Project not found", 404);
    }
    if (
      props.body.hrm_time_tracking_employee_id !== undefined &&
      props.body.hrm_time_tracking_employee_id !== null
    ) {
      const membership =
        await prisma.hrm_time_tracking_project_memberships.findFirst({
          where: {
            hrm_time_tracking_project_id: props.projectId,
            hrm_time_tracking_employee_id:
              props.body.hrm_time_tracking_employee_id,
            deleted_at: null,
          },
          select: {
            id: true,
          },
        });
      if (membership === null) {
        throw new HttpException(
          "Assignee must already be a member of the same project.",
          400,
        );
      }
    }
    if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
      const parent = await prisma.hrm_time_tracking_tasks.findUniqueOrThrow({
        where: {
          id: props.body.parent_id,
        },
        select: {
          id: true,
          hrm_time_tracking_project_id: true,
          parent_id: true,
          deleted_at: true,
        },
      });
      if (parent.deleted_at !== null) {
        throw new HttpException("Parent task not found", 404);
      }
      if (parent.hrm_time_tracking_project_id !== props.projectId) {
        throw new HttpException(
          "Parent task must belong to the same project.",
          400,
        );
      }
      if (parent.parent_id !== null) {
        throw new HttpException(
          "Only one level of subtask nesting is allowed.",
          400,
        );
      }
    }
    const duplicate = await prisma.hrm_time_tracking_tasks.findFirst({
      where: {
        hrm_time_tracking_project_id: props.projectId,
        parent_id: props.body.parent_id ?? null,
        title: props.body.title,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (duplicate !== null) {
      throw new HttpException(
        "A task with the same title already exists in this scope.",
        409,
      );
    }
    try {
      const created = await prisma.hrm_time_tracking_tasks.create({
        data: await HrmTimeTrackingTaskCollector.collect({
          body: props.body,
          project: {
            id: project.id,
          },
        }),
        ...HrmTimeTrackingTaskTransformer.select(),
      });
      return await HrmTimeTrackingTaskTransformer.transform(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new HttpException(
          "A task with the same title already exists in this scope.",
          409,
        );
      }
      throw error;
    }
  });
}
