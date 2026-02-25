import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorAuditLogs(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
  const { page = 1, limit = 20 } = props.body;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const where: Prisma.discussion_board_audit_logsWhereInput = {};
  if (props.body.event_type !== undefined) {
    where.event_type = props.body.event_type;
  }
  if (props.body.actor_id !== undefined) {
    where.actor_id = props.body.actor_id;
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    where.created_at = {};
    if (props.body.created_at_from !== undefined) {
      where.created_at.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to !== undefined) {
      where.created_at.lte = props.body.created_at_to;
    }
  }
  const total = await MyGlobal.prisma.discussion_board_audit_logs.count({
    where,
  });
  const skip = (page - 1) * limit;
  const dataRecords =
    await MyGlobal.prisma.discussion_board_audit_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        event_type: true,
        event_description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        actor: {
          select: {
            id: true,
            email: true,
            display_name: true,
            bio: true,
            is_banned: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  function transformActor(
    actor: (typeof dataRecords)[number]["actor"],
  ): IDiscussionBoardRegisteredUser.ISummary | null {
    if (!actor) return null;
    return {
      id: actor.id,
      email: actor.email,
      displayName: actor.display_name,
      bio: actor.bio ?? null,
      isBanned: actor.is_banned,
      createdAt:
        toISOStringSafe(actor.created_at ?? undefined) ??
        ("1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">),
      updatedAt:
        toISOStringSafe(actor.updated_at ?? undefined) ??
        ("1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">),
      deletedAt:
        actor.deleted_at !== null && actor.deleted_at !== undefined
          ? toISOStringSafe(actor.deleted_at)
          : null,
    };
  }
  const data: IDiscussionBoardAuditLog.ISummary[] = dataRecords.map(
    (record) => {
      return {
        id: record.id,
        eventType: record.event_type,
        eventDescription: record.event_description,
        createdAt:
          toISOStringSafe(record.created_at ?? undefined) ??
          ("1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">),
        updatedAt:
          toISOStringSafe(record.updated_at ?? undefined) ??
          ("1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">),
        deletedAt:
          record.deleted_at !== null && record.deleted_at !== undefined
            ? toISOStringSafe(record.deleted_at)
            : null,
        actor: transformActor(record.actor),
      };
    },
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
