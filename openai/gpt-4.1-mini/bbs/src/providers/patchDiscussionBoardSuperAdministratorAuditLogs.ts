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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdministratorAuditLogs(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
  if (props.superAdministrator.type !== "superadministrator") {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const where = {
    deleted_at: null,
    ...(props.body.event_type !== undefined
      ? { event_type: props.body.event_type }
      : {}),
    ...(props.body.actor_id !== undefined
      ? { actor_id: props.body.actor_id }
      : {}),
    ...(props.body.created_at_from !== undefined
      ? { created_at: { gte: props.body.created_at_from } }
      : {}),
    ...(props.body.created_at_to !== undefined
      ? { created_at: { lte: props.body.created_at_to } }
      : {}),
  } satisfies Prisma.discussion_board_audit_logsWhereInput;
  const records = await MyGlobal.prisma.discussion_board_audit_logs.findMany({
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
  const total = await MyGlobal.prisma.discussion_board_audit_logs.count({
    where,
  });
  function toDateTimeString(input: unknown): string & tags.Format<"date-time"> {
    if (typeof input === "string") {
      return input as string & tags.Format<"date-time">;
    }
    if (input instanceof Date) {
      return input.toISOString() as string & tags.Format<"date-time">;
    }
    throw new HttpException("Invalid date format", 400);
  }
  function toNullableDateTimeString(
    input: unknown,
  ): (string & tags.Format<"date-time">) | null {
    if (input === null || input === undefined) {
      return null;
    }
    return toDateTimeString(input);
  }
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      eventType: record.event_type,
      eventDescription: record.event_description,
      createdAt: toDateTimeString(record.created_at),
      updatedAt: toDateTimeString(record.updated_at),
      deletedAt: toNullableDateTimeString(record.deleted_at),
      actor:
        record.actor === null
          ? null
          : {
              id: record.actor.id,
              email: record.actor.email,
              displayName: record.actor.display_name,
              bio: record.actor.bio ?? null,
              isBanned: record.actor.is_banned,
              createdAt: toDateTimeString(record.actor.created_at),
              updatedAt: toDateTimeString(record.actor.updated_at),
              deletedAt: toNullableDateTimeString(record.actor.deleted_at),
            },
    })),
  };
}
