import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmsTaskCollector } from "../collectors/HrmsTaskCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberOrganizationsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmsTask.ICreate;
}): Promise<IHrmsTask> {
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: props.projectId, deleted_at: null },
  });
  if (
    props.body.hrms_employee_id !== undefined &&
    props.body.hrms_employee_id !== null
  ) {
    const employeeAssignment =
      await MyGlobal.prisma.hrms_project_members.findFirst({
        where: {
          employee_id: props.body.hrms_employee_id,
          project_id: props.projectId,
          deleted_at: null,
        },
      });
    if (employeeAssignment === null) {
      throw new HttpException(
        "Assigned employee is not a member of the project",
        400,
      );
    }
  }
  const created = await MyGlobal.prisma.hrms_tasks.create({
    data: await HrmsTaskCollector.collect({
      body: props.body,
      hrmsProjects: project,
    }),
  });
  return {
    analytics: [],
    total_projects: 0,
    total_budget_hours: null,
    total_logged_hours: null,
  } satisfies IHrmsTask;
}
