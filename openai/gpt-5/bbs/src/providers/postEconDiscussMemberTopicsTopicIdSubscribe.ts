import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconDiscussMemberTopicsTopicIdSubscribe(props: {
  member: MemberPayload;
  topicId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, topicId } = props;

  const memberRole = await MyGlobal.prisma.econ_discuss_members.findFirst({
    where: {
      user_id: member.id,
      deleted_at: null,
      user: {
        is: { deleted_at: null },
      },
    },
    select: { id: true },
  });
  if (!memberRole) {
    throw new HttpException("Forbidden", 403);
  }

  const topic = await MyGlobal.prisma.econ_discuss_topics.findFirst({
    where: { id: topicId, deleted_at: null },
    select: { id: true },
  });
  if (!topic) {
    throw new HttpException("Not Found", 404);
  }

  const now = toISOStringSafe(new Date());

  const reactivated =
    await MyGlobal.prisma.econ_discuss_user_topic_subscriptions.updateMany({
      where: {
        econ_discuss_user_id: member.id,
        econ_discuss_topic_id: topicId,
        deleted_at: { not: null },
      },
      data: {
        deleted_at: null,
        updated_at: now,
      },
    });
  if (reactivated.count > 0) return;

  try {
    await MyGlobal.prisma.econ_discuss_user_topic_subscriptions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        econ_discuss_user_id: member.id,
        econ_discuss_topic_id: topicId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return; // Already exists → idempotent success
    }
    throw new HttpException("Conflict", 409);
  }
}
