import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussReputationEvent";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconDiscussMemberUsersUserIdReputationEventsEventId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  eventId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussReputationEvent> {
  const { member, userId, eventId } = props;

  // Authorization: restrict access to the owner of the events
  if (member.id !== userId) {
    throw new HttpException(
      "Forbidden: You can only access your own reputation events",
      403,
    );
  }

  const row = await MyGlobal.prisma.econ_discuss_reputation_events.findFirst({
    where: {
      id: eventId,
      user_id: userId,
      deleted_at: null,
    },
    select: {
      id: true,
      user_id: true,
      actor_user_id: true,
      post_id: true,
      points: true,
      reason: true,
      source: true,
      occurred_at: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!row) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: row.id as string & tags.Format<"uuid">,
    userId: row.user_id as string & tags.Format<"uuid">,
    actorUserId:
      row.actor_user_id === null
        ? null
        : (row.actor_user_id as string & tags.Format<"uuid">),
    postId:
      row.post_id === null
        ? null
        : (row.post_id as string & tags.Format<"uuid">),
    points: row.points as number & tags.Type<"int32">,
    reason: row.reason,
    source: row.source ?? null,
    occurredAt: toISOStringSafe(row.occurred_at),
    createdAt: toISOStringSafe(row.created_at),
    updatedAt: toISOStringSafe(row.updated_at),
  };
}
