import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimer";
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

export async function getHrmTrackerMemberTimersStatus(props: {
  member: MemberPayload;
}): Promise<IHrmTrackerTimer> {
  const timer = await MyGlobal.prisma.hrm_tracker_timers.findFirstOrThrow({
    where: {
      employee_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      employee_id: true,
      project_id: true,
      task_id: true,
      description: true,
      start_timestamp: true,
      created_at: true,
      updated_at: true,
    },
  });
  return {
    id: timer.id,
    employee_id: timer.employee_id,
    project_id: timer.project_id,
    task_id: timer.task_id,
    description: timer.description,
    start_timestamp: timer.start_timestamp.toISOString(),
    created_at: timer.created_at.toISOString(),
    updated_at: timer.updated_at.toISOString(),
  };
}
