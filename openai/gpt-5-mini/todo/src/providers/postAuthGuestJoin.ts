import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestJoin(): Promise<ITodoAppGuest.IAuthorized> {
  try {
    const now = toISOStringSafe(new Date());

    const guestId = v4() as string & tags.Format<"uuid">;
    const activityId = v4() as string & tags.Format<"uuid">;

    const [createdGuest, createdActivity] = await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.todo_app_guest.create({
        data: {
          id: guestId,
          created_at: now,
          updated_at: now,
        },
      }),
      MyGlobal.prisma.todo_app_user_activity_logs.create({
        data: {
          id: activityId,
          todo_app_todouser_id: null,
          todo_app_todouser_session_id: null,
          todo_app_list_id: null,
          todo_app_task_id: null,
          activity_type: "guest_join",
          details: `Guest created: ${guestId}`,
          ip: null,
          href: null,
          created_at: now,
          updated_at: now,
        },
      }),
    ]);

    // Ephemeral session id for inclusion in tokens (not persisted)
    const sessionId = v4() as string & tags.Format<"uuid">;

    const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const token = {
      access: jwt.sign(
        {
          type: "guest",
          id: createdGuest.id,
          session_id: sessionId,
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "guest",
          id: createdGuest.id,
          session_id: sessionId,
          tokenType: "refresh",
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    };

    return {
      id: createdGuest.id,
      anonymousLabel: createdGuest.anonymous_label ?? undefined,
      createdAt: toISOStringSafe(createdGuest.created_at),
      updatedAt: toISOStringSafe(createdGuest.updated_at),
      deletedAt: createdGuest.deleted_at
        ? toISOStringSafe(createdGuest.deleted_at)
        : null,
      token,
      guest: {
        id: createdGuest.id,
        anonymousLabel: createdGuest.anonymous_label ?? undefined,
        createdAt: toISOStringSafe(createdGuest.created_at),
        updatedAt: toISOStringSafe(createdGuest.updated_at),
        deletedAt: createdGuest.deleted_at
          ? toISOStringSafe(createdGuest.deleted_at)
          : null,
      },
    };
  } catch (err) {
    // Unexpected errors should be translated to HttpException for controller
    throw new HttpException("Internal Server Error", 500);
  }
}
