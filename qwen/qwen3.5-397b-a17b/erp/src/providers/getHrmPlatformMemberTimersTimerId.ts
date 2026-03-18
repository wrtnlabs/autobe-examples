import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
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
import { HrmPlatformEmployeeAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformProjectAtSummaryTransformer } from "../transformers/HrmPlatformProjectAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "../transformers/HrmPlatformTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimer> {
  // Find the employee record for this authenticated member
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // Fetch the timer with all required relations using transformer select
  // Explicitly include employee_id for ownership validation
  const timer = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
    where: {
      id: props.timerId,
      deleted_at: null,
    },
    select: {
      id: true,
      employee_id: true,
      started_at: true,
      stopped_at: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
      project: HrmPlatformProjectAtSummaryTransformer.select(),
      task: HrmPlatformTaskAtSummaryTransformer.select(),
    },
  });
  // Validate ownership - timer must belong to this employee
  if (timer.employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return the timer record
  return {
    id: timer.id,
    employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
      timer.employee,
    ),
    project: await HrmPlatformProjectAtSummaryTransformer.transform(
      timer.project,
    ),
    task: timer.task
      ? await HrmPlatformTaskAtSummaryTransformer.transform(timer.task)
      : null,
    started_at: timer.started_at.toISOString(),
    stopped_at: timer.stopped_at?.toISOString() ?? null,
    description: timer.description ?? null,
    created_at: timer.created_at.toISOString(),
    updated_at: timer.updated_at.toISOString(),
  } satisfies IHrmPlatformTimer;
}
