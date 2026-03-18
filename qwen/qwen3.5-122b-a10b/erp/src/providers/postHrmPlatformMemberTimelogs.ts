import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformTimelogCollector } from "../collectors/HrmPlatformTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmPlatformTimelog.ICreate;
}): Promise<IHrmPlatformTimelog> {
  // Validate project exists
  await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
    where: { id: props.body.project_id },
  });
  // Validate task if provided
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.body.task_id },
      select: { hrm_platform_projects_id: true, deleted_at: true },
    });
    if (task.hrm_platform_projects_id !== props.body.project_id) {
      throw new HttpException(
        "The specified task does not belong to the given project",
        400,
      );
    }
    if (task.deleted_at !== null) {
      throw new HttpException("The specified task has been deleted", 400);
    }
  }
  // Validate date is not in the future
  const now = new Date();
  const inputDate = new Date(props.body.date);
  if (inputDate > now) {
    throw new HttpException("Time entry date cannot be in the future", 400);
  }
  // Create timelog using collector
  const created = await MyGlobal.prisma.hrm_platform_timelogs.create({
    data: await HrmPlatformTimelogCollector.collect({
      body: props.body,
      employee: { id: props.member.id },
    }),
    ...HrmPlatformTimelogTransformer.select(),
  });
  return await HrmPlatformTimelogTransformer.transform(created);
}
