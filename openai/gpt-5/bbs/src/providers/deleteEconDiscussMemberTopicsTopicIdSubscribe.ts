import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconDiscussMemberTopicsTopicIdSubscribe(props: {
  member: MemberPayload;
  topicId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, topicId } = props;

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  await MyGlobal.prisma.econ_discuss_user_topic_subscriptions.updateMany({
    where: {
      econ_discuss_user_id: member.id,
      econ_discuss_topic_id: topicId,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
