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

export async function deleteHrmsMemberTimer(props: {
  member: MemberPayload;
}): Promise<void> {
  const timer = await MyGlobal.prisma.hrms_timers.findFirstOrThrow({
    where: {
      hrms_employee_id: props.member.id,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.hrms_timers.update({
    where: { id: timer.id },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
