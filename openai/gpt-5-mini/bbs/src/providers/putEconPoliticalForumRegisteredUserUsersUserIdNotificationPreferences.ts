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

export async function putEconPoliticalForumRegisteredUserUsersUserIdNotificationPreferences(props: {
  registeredUser: RegistereduserPayload;
  userId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumNotificationPreferences.IUpdate;
}): Promise<IEconPoliticalForumNotificationPreferences> {
  const { registeredUser, userId, body } = props;

  const targetUser =
    await MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  if (!targetUser) throw new HttpException("Not Found", 404);

  if (registeredUser.id !== userId) {
    const admin =
      await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
        where: { registereduser_id: registeredUser.id, deleted_at: null },
        select: { id: true },
      });
    if (!admin) throw new HttpException("Forbidden", 403);
  }

  if (
    body.preferences_payload !== undefined &&
    body.preferences_payload !== null
  ) {
    if (typeof body.preferences_payload !== "string")
      throw new HttpException(
        "Bad Request: preferences_payload must be a string or null",
        400,
      );
    if (body.preferences_payload.length > 5000)
      throw new HttpException(
        "Bad Request: preferences_payload too large",
        400,
      );
    try {
      JSON.parse(body.preferences_payload);
    } catch (_e) {
      throw new HttpException(
        "Bad Request: preferences_payload must be valid JSON",
        400,
      );
    }
  }

  const now = toISOStringSafe(new Date());

  const prefs =
    await MyGlobal.prisma.econ_political_forum_notification_preferences.upsert({
      where: { registereduser_id: userId },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        registereduser_id: userId,
        in_app: body.in_app ?? false,
        email: body.email ?? false,
        push: body.push ?? false,
        preferences_payload: body.preferences_payload ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      update: {
        ...(body.in_app === undefined ? {} : { in_app: body.in_app }),
        ...(body.email === undefined ? {} : { email: body.email }),
        ...(body.push === undefined ? {} : { push: body.push }),
        ...(body.preferences_payload === undefined
          ? {}
          : { preferences_payload: body.preferences_payload }),
        updated_at: now,
      },
    });

  const changedFields: string[] = [];
  if (body.in_app !== undefined) changedFields.push("in_app");
  if (body.email !== undefined) changedFields.push("email");
  if (body.push !== undefined) changedFields.push("push");
  if (body.preferences_payload !== undefined)
    changedFields.push("preferences_payload");

  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: registeredUser.id,
      action_type: "update_notification_preferences",
      target_type: "user",
      target_identifier: userId,
      details: JSON.stringify({ fields: changedFields }),
      created_at: now,
      created_by_system: false,
    },
  });

  return {
    id: prefs.id as string & tags.Format<"uuid">,
    registereduser_id: prefs.registereduser_id as string & tags.Format<"uuid">,
    in_app: prefs.in_app,
    email: prefs.email,
    push: prefs.push,
    preferences_payload: prefs.preferences_payload ?? undefined,
    created_at: prefs.created_at ? toISOStringSafe(prefs.created_at) : now,
    updated_at: prefs.updated_at ? toISOStringSafe(prefs.updated_at) : now,
    deleted_at: prefs.deleted_at ? toISOStringSafe(prefs.deleted_at) : null,
  };
}
