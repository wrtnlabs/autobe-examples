import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteHrmPlatformMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  const timer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      id: props.timerId,
      hrm_platform_employee_id: employee.id,
    },
  });
  if (!timer) {
    throw new HttpException("Timer not found or does not belong to you", 404);
  }
  if (timer.stopped_at !== null) {
    throw new HttpException("Timer is already stopped", 400);
  }
  await MyGlobal.prisma.hrm_platform_timers.delete({
    where: { id: props.timerId },
  });
}
