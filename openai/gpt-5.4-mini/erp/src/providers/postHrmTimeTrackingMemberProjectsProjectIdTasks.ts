import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingTaskCollector } from "../collectors/HrmTimeTrackingTaskCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTaskTransformer } from "../transformers/HrmTimeTrackingTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTask.ICreate;
}): Promise<IHrmTimeTrackingTask> {
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
      where: {
        id: props.projectId,
      },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (project.deleted_at !== null) {
    throw new HttpException("Project is not accepting new tasks", 400);
  }
  if (project.status === "archived" || project.status === "completed") {
    throw new HttpException("Project is not accepting new tasks", 400);
  }
  const created = await MyGlobal.prisma.hrm_time_tracking_tasks.create({
    data: await HrmTimeTrackingTaskCollector.collect({
      body: props.body,
      project: {
        id: props.projectId,
      },
    }),
    ...HrmTimeTrackingTaskTransformer.select(),
  });
  return await HrmTimeTrackingTaskTransformer.transform(created);
}
