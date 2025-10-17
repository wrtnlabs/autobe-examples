import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotificationPreferences";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function getEconPoliticalForumRegisteredUserUsersUserIdNotificationPreferences(props: {
  registeredUser: RegistereduserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumNotificationPreferences> {
  const { registeredUser, userId } = props;

  // Authorization: only owner allowed (no admin payload provided)
  if (registeredUser.id !== userId) {
    throw new HttpException(
      "Forbidden: you are not allowed to access these preferences",
      403,
    );
  }

  // Verify the target registered user exists (and not soft-deleted / banned)
  const target =
    await MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  if (!target) {
    throw new HttpException("Not Found: registered user does not exist", 404);
  }

  // Helper: sanitize preferences_payload by removing potential secrets
  const sanitizePreferencesPayload = (
    payload: string | null | undefined,
  ): string | undefined => {
    if (payload === undefined) return undefined;
    if (payload === null) return undefined;

    try {
      const parsed = JSON.parse(payload);

      const redact = (obj: unknown): unknown => {
        if (obj === null || typeof obj !== "object") return obj;
        if (Array.isArray(obj)) return obj.map(redact);
        const input = obj as Record<string, unknown>;
        const output: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(input)) {
          // redact keys that look like secrets
          if (/token|secret|password|webhook/i.test(k)) {
            output[k] = "[REDACTED]";
            continue;
          }

          if (typeof v === "string") {
            // redact long opaque strings that look like tokens
            if (
              /bearer\s+[A-Za-z0-9\-_.]+/i.test(v) ||
              /(?:[A-Za-z0-9_\-]{20,})/.test(v)
            ) {
              output[k] = "[REDACTED]";
              continue;
            }
            output[k] = v;
            continue;
          }

          output[k] = redact(v);
        }
        return output;
      };

      const sanitized = redact(parsed);
      return JSON.stringify(sanitized);
    } catch (e) {
      // If payload is not valid JSON or other error, return undefined to match target type
      return undefined;
    }
  };

  // Fetch active preferences (ignore soft-deleted rows)
  const prefs =
    await MyGlobal.prisma.econ_political_forum_notification_preferences.findFirst(
      {
        where: { registereduser_id: userId, deleted_at: null },
      },
    );

  if (prefs) {
    // Map Prisma result to DTO, converting dates to ISO strings safely
    const mapped = {
      id: prefs.id as string & tags.Format<"uuid">,
      registereduser_id: prefs.registereduser_id as string &
        tags.Format<"uuid">,
      in_app: prefs.in_app,
      email: prefs.email,
      push: prefs.push,
      preferences_payload: sanitizePreferencesPayload(
        prefs.preferences_payload,
      ),
      created_at: toISOStringSafe(prefs.created_at),
      updated_at: toISOStringSafe(prefs.updated_at),
      deleted_at: prefs.deleted_at ? toISOStringSafe(prefs.deleted_at) : null,
    } satisfies IEconPoliticalForumNotificationPreferences;

    return mapped;
  }

  // No active preferences found: return default preferences (policy decision)
  const now = toISOStringSafe(new Date());
  const fallback = {
    id: v4() as string & tags.Format<"uuid">,
    registereduser_id: userId,
    in_app: true,
    email: true,
    push: false,
    preferences_payload: undefined,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  } satisfies IEconPoliticalForumNotificationPreferences;

  return fallback;
}
