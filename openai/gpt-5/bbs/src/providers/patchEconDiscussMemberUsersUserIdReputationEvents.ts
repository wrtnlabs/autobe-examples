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

export async function patchEconDiscussMemberUsersUserIdReputationEvents(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IEconDiscussReputationEvent.IRequest;
}): Promise<IPageIEconDiscussReputationEvent> {
  const { member, userId, body } = props;

  if (member.id !== userId) {
    throw new HttpException(
      "Forbidden: You can only access your own reputation events",
      403,
    );
  }

  const page: number = Math.max(1, Number(body.page ?? 1));
  const limit: number = Math.max(1, Math.min(200, Number(body.limit ?? 20)));
  const skip: number = (page - 1) * limit;

  const sortBy: IEReputationEventSortBy = (body.sortBy ??
    "occurred_at") as IEReputationEventSortBy;
  const sortOrder: IESortOrder = (body.sortOrder ?? "desc") as IESortOrder;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_reputation_events.findMany({
      where: {
        deleted_at: null,
        user_id: userId,
        ...(body.postId !== undefined && { post_id: body.postId }),
        ...(body.reason !== undefined &&
          body.reason !== null && {
            reason: { contains: body.reason },
          }),
        ...(body.pointsMin !== undefined || body.pointsMax !== undefined
          ? {
              points: {
                ...(body.pointsMin !== undefined && { gte: body.pointsMin }),
                ...(body.pointsMax !== undefined && { lte: body.pointsMax }),
              },
            }
          : {}),
        ...(body.dateFrom !== undefined || body.dateTo !== undefined
          ? {
              occurred_at: {
                ...(body.dateFrom !== undefined && { gte: body.dateFrom }),
                ...(body.dateTo !== undefined && { lte: body.dateTo }),
              },
            }
          : {}),
      },
      orderBy:
        sortBy === "occurred_at"
          ? { occurred_at: sortOrder }
          : sortBy === "created_at"
            ? { created_at: sortOrder }
            : { points: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.econ_discuss_reputation_events.count({
      where: {
        deleted_at: null,
        user_id: userId,
        ...(body.postId !== undefined && { post_id: body.postId }),
        ...(body.reason !== undefined &&
          body.reason !== null && {
            reason: { contains: body.reason },
          }),
        ...(body.pointsMin !== undefined || body.pointsMax !== undefined
          ? {
              points: {
                ...(body.pointsMin !== undefined && { gte: body.pointsMin }),
                ...(body.pointsMax !== undefined && { lte: body.pointsMax }),
              },
            }
          : {}),
        ...(body.dateFrom !== undefined || body.dateTo !== undefined
          ? {
              occurred_at: {
                ...(body.dateFrom !== undefined && { gte: body.dateFrom }),
                ...(body.dateTo !== undefined && { lte: body.dateTo }),
              },
            }
          : {}),
      },
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
    source: row.source ?? undefined,
    occurredAt: toISOStringSafe(row.occurred_at),
    createdAt: toISOStringSafe(row.created_at),
    updatedAt: toISOStringSafe(row.updated_at),
  }));

  const pages: number = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
