import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussReputationEvent";
import { IEReputationEventSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEReputationEventSortBy";
import { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import { IPageIEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussReputationEvent";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchEconDiscussMemberMeReputationEvents(props: {
  member: MemberPayload;
  body: IEconDiscussReputationEvent.IRequest;
}): Promise<IPageIEconDiscussReputationEvent> {
  const { member, body } = props;

  // Business rule: invalid date range should be rejected
  if (body.dateFrom !== undefined && body.dateTo !== undefined) {
    if (body.dateFrom > body.dateTo) {
      throw new HttpException(
        "Bad Request: dateFrom must be less than or equal to dateTo",
        400,
      );
    }
  }

  const pageNum = Number(body.page ?? 1);
  const limitNum = Number(body.limit ?? 20);
  const skip = (pageNum - 1) * limitNum;

  const whereCondition = {
    user_id: member.id,
    deleted_at: null,
    // occurred_at range
    ...(body.dateFrom !== undefined || body.dateTo !== undefined
      ? {
          occurred_at: {
            ...(body.dateFrom !== undefined && { gte: body.dateFrom }),
            ...(body.dateTo !== undefined && { lte: body.dateTo }),
          },
        }
      : {}),
    // points range
    ...(body.pointsMin !== undefined || body.pointsMax !== undefined
      ? {
          points: {
            ...(body.pointsMin !== undefined && { gte: body.pointsMin }),
            ...(body.pointsMax !== undefined && { lte: body.pointsMax }),
          },
        }
      : {}),
    // reason substring filter
    ...(body.reason !== undefined && body.reason !== ""
      ? { reason: { contains: body.reason } }
      : {}),
    // postId equality
    ...(body.postId !== undefined && { post_id: body.postId }),
  };

  const sortBy = body.sortBy ?? ("occurred_at" as IEReputationEventSortBy);
  const sortOrder = body.sortOrder ?? ("desc" as IESortOrder);

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_reputation_events.findMany({
      where: whereCondition,
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
      orderBy:
        sortBy === "points"
          ? { points: sortOrder }
          : sortBy === "created_at"
            ? { created_at: sortOrder }
            : { occurred_at: sortOrder },
      skip,
      take: limitNum,
    }),
    MyGlobal.prisma.econ_discuss_reputation_events.count({
      where: whereCondition,
    }),
  ]);

  const data: IEconDiscussReputationEvent[] = rows.map((row) => ({
    id: row.id as string & tags.Format<"uuid">,
    userId: row.user_id as string & tags.Format<"uuid">,
    actorUserId:
      row.actor_user_id === null
        ? undefined
        : (row.actor_user_id as string & tags.Format<"uuid">),
    postId:
      row.post_id === null
        ? undefined
        : (row.post_id as string & tags.Format<"uuid">),
    points: row.points as number & tags.Type<"int32">,
    reason: row.reason,
    source: row.source === null ? undefined : row.source,
    occurredAt: toISOStringSafe(row.occurred_at),
    createdAt: toISOStringSafe(row.created_at),
    updatedAt: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(limitNum),
      records: total,
      pages: Math.ceil(total / (limitNum || 1)),
    },
    data,
  };
}
