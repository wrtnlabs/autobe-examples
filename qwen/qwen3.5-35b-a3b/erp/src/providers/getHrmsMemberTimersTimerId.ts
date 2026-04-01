import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsTimerTransformer } from "../transformers/HrmsTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<IHrmsTimer> {
  const employee = await MyGlobal.prisma.hrms_employees.findFirstOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const timer = await MyGlobal.prisma.hrms_timers.findUniqueOrThrow({
    where: {
      id: props.timerId,
    },
    ...HrmsTimerTransformer.select(),
  });
  if (timer.employee.id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timer.deleted_at !== null) {
    throw new HttpException("Timer has been discarded", 404);
  }
  return await HrmsTimerTransformer.transform(timer);
}
