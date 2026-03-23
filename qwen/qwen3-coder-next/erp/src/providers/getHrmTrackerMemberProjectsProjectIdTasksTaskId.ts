import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerTaskTransformer } from "../transformers/HrmTrackerTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTrackerMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string;
  taskId: string;
}): Promise<IHrmTrackerTask> {
  const task = await MyGlobal.prisma.hrm_tracker_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      project_id: props.projectId,
      deleted_at: null,
    },
    ...HrmTrackerTaskTransformer.select(),
  });
  return await HrmTrackerTaskTransformer.transform(task);
}
