import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconDiscussMemberMeNotificationsMarkAllRead(props: {
  member: MemberPayload;
}): Promise<void> {
  const { member } = props;

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  await MyGlobal.prisma.econ_discuss_notifications.updateMany({
    where: {
      recipient_user_id: member.id,
      read_at: null,
      deleted_at: null,
    },
    data: {
      read_at: now,
    },
  });
}
