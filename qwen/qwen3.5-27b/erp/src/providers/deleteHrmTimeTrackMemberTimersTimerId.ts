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

export async function deleteHrmTimeTrackMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Retrieve the timer with employee and member relationships for ownership validation
  const timer = await MyGlobal.prisma.hrm_time_track_timers.findUniqueOrThrow({
    where: {
      id: props.timerId,
    },
    select: {
      id: true,
      is_active: true,
      employee: {
        select: {
          id: true,
          member: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });
  // Verify the timer is currently active
  if (timer.is_active === false) {
    throw new HttpException("Timer is not active", 400);
  }
  // Validate ownership - the authenticated member must own the timer's employee
  if (timer.employee.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the timer record (discard - no timelog created)
  await MyGlobal.prisma.hrm_time_track_timers.delete({
    where: {
      id: props.timerId,
    },
  });
}
