import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getDiscussionBoardSuperAdministratorAuditLogsId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAuditLog> {
  const record = await MyGlobal.prisma.discussion_board_audit_logs.findUnique({
    where: { id: props.id },
    select: {
      id: true,
      actor_id: true,
      event_type: true,
      event_description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      actor: {
        select: {
          id: true,
          email: true,
          // Remove nickname from select as it likely does not exist in the Prisma model to avoid errors
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  if (record === null) {
    throw new HttpException("Audit log entry not found", 404);
  }
  return {
    id: record.id,
    actor_id: record.actor_id,
    event_type: record.event_type,
    event_description: record.event_description,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    actor:
      record.actor_id === null || record.actor === null
        ? null
        : {
            id: record.actor.id,
            email: record.actor.email,
            created_at: toISOStringSafe(record.actor.created_at),
            updated_at: toISOStringSafe(record.actor.updated_at),
            deleted_at:
              record.actor.deleted_at === null
                ? null
                : toISOStringSafe(record.actor.deleted_at),
          },
  };
}
