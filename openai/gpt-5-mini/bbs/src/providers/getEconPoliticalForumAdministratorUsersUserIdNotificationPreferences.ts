import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotificationPreferences";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getEconPoliticalForumAdministratorUsersUserIdNotificationPreferences(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumNotificationPreferences> {
  const { administrator, userId } = props;

  const adminRecord =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: {
        registereduser_id: administrator.id,
        deleted_at: null,
        registereduser: {
          deleted_at: null,
          is_banned: false,
        },
      },
    });

  if (adminRecord === null)
    throw new HttpException("Unauthorized: administrator not enrolled", 403);

  const targetUser =
    await MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
      where: { id: userId },
    });
  if (targetUser === null) throw new HttpException("Not Found", 404);

  const prefs =
    await MyGlobal.prisma.econ_political_forum_notification_preferences.findUnique(
      {
        where: { registereduser_id: userId },
      },
    );
  if (prefs === null) throw new HttpException("Not Found", 404);

  const sanitizePayload = (payload?: string | null): string | undefined => {
    if (payload === undefined || payload === null) return undefined;
    try {
      const parsed = JSON.parse(payload);
      const sensitiveKeys = new Set([
        "password",
        "pass",
        "pwd",
        "token",
        "access_token",
        "refresh_token",
        "secret",
        "api_key",
        "apikey",
        "auth",
      ]);

      const sanitizeRecursive = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(sanitizeRecursive);
        if (value && typeof value === "object") {
          const obj: Record<string, unknown> = {};
          for (const key of Object.keys(value as Record<string, unknown>)) {
            const val = (value as Record<string, unknown>)[key];
            if (sensitiveKeys.has(key.toLowerCase())) obj[key] = "[REDACTED]";
            else obj[key] = sanitizeRecursive(val);
          }
          return obj;
        }
        return value;
      };

      const cleaned = sanitizeRecursive(parsed);
      return JSON.stringify(cleaned);
    } catch {
      const lowered = payload.toLowerCase();
      if (
        lowered.includes("token=") ||
        lowered.includes("access_token") ||
        lowered.includes("refresh_token") ||
        lowered.includes("api_key") ||
        lowered.includes("secret")
      ) {
        return "[REDACTED]";
      }
      return payload;
    }
  };

  const sanitized = sanitizePayload(prefs.preferences_payload);

  const auditId = v4() satisfies string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: auditId,
      registereduser_id: administrator.id,
      action_type: "read",
      target_type: "notification_preferences",
      target_identifier: userId,
      details: `Administrator view: ${administrator.id} viewed notification preferences for ${userId}`,
      created_at: now,
      created_by_system: false,
    },
  });

  const result: IEconPoliticalForumNotificationPreferences = {
    id: prefs.id,
    registereduser_id: prefs.registereduser_id,
    in_app: prefs.in_app,
    email: prefs.email,
    push: prefs.push,
    preferences_payload: sanitized ?? undefined,
    created_at: toISOStringSafe(prefs.created_at),
    updated_at: toISOStringSafe(prefs.updated_at),
    deleted_at: prefs.deleted_at ? toISOStringSafe(prefs.deleted_at) : null,
  };

  return result;
}
