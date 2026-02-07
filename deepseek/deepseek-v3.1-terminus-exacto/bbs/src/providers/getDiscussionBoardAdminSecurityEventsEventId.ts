import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminSecurityEventsEventId(props: {
  admin: AdminPayload;
  eventId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSecurityEvent> {
  const event =
    await MyGlobal.prisma.discussion_board_security_events.findUnique({
      where: { id: props.eventId },
      select: {
        id: true,
        event_type: true,
        severity: true,
        description: true,
        source_ip: true,
        user_agent: true,
        event_data: true,
        resolved: true,
        resolved_at: true,
        resolved_by: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
            updated_at: true,
          },
        },
        admin: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
        superAdmin: {
          select: {
            id: true,
            email: true,
            privilege_level: true,
            created_at: true,
          },
        },
      },
    });
  if (!event) {
    throw new HttpException("Security event not found", 404);
  }
  return {
    id: event.id,
    event_type: event.event_type,
    severity: event.severity,
    description: event.description,
    source_ip: event.source_ip,
    user_agent: event.user_agent,
    event_data: event.event_data === null ? undefined : event.event_data,
    resolved: event.resolved,
    resolved_at: event.resolved_at
      ? toISOStringSafe(event.resolved_at)
      : undefined,
    resolved_by: event.resolved_by === null ? undefined : event.resolved_by,
    created_at: toISOStringSafe(event.created_at),
    updated_at: toISOStringSafe(event.updated_at),
    user: event.user
      ? {
          id: event.user.id,
          display_name: event.user.display_name,
          bio: event.user.bio,
          created_at: toISOStringSafe(event.user.created_at),
          updated_at: toISOStringSafe(event.user.updated_at),
        }
      : undefined,
    admin: event.admin
      ? {
          id: event.admin.id,
          email: event.admin.email,
          display_name: event.admin.display_name,
          created_at: toISOStringSafe(event.admin.created_at),
        }
      : undefined,
    superAdmin: event.superAdmin
      ? {
          id: event.superAdmin.id,
          email: event.superAdmin.email,
          privilege_level: event.superAdmin.privilege_level,
          created_at: toISOStringSafe(event.superAdmin.created_at),
        }
      : undefined,
  };
}
