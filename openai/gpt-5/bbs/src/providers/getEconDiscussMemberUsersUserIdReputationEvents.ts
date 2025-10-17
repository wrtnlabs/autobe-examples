import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussReputationEvent";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussReputationEvent";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconDiscussMemberUsersUserIdReputationEvents(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IPageIEconDiscussReputationEvent> {
  const { member, userId } = props;

  // Authorization: owner-only access
  if (member.id !== userId) {
    throw new HttpException("Forbidden", 403);
  }

  // Default pagination (0-based current page, 20 items per page)
  const current = 0;
  const limit = 20;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_reputation_events.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      orderBy: { occurred_at: "desc" },
      skip: current * limit,
      take: limit,
    }),
    MyGlobal.prisma.econ_discuss_reputation_events.count({
      where: {
        user_id: userId,
        deleted_at: null,
      },
    }),
  ]);

  const data: IEconDiscussReputationEvent[] = rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    actorUserId: row.actor_user_id ?? null,
    postId: row.post_id ?? null,
    points: row.points,
    reason: row.reason,
    source: row.source ?? null,
    occurredAt: toISOStringSafe(row.occurred_at),
    createdAt: toISOStringSafe(row.created_at),
    updatedAt: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
