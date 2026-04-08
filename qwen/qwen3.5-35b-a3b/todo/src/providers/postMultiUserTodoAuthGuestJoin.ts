import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthGuestJoin(props: {
  ip: string;
  body: IMultiUserTodoGuest.IJoin;
}): Promise<IMultiUserTodoGuest.IAuthorized> {
  // Generate fingerprint hash from available data
  const fingerprintData: string = [
    props.body.email,
    props.body.href,
    props.body.referrer,
    props.body.ip ?? props.ip,
  ].join("|");
  const fingerprint_hash: string & tags.Format<"uuid"> = require("crypto")
    .createHash("sha256")
    .update(fingerprintData)
    .digest("hex");
  // Check for existing guest by fingerprint
  const existingGuest = await MyGlobal.prisma.multi_user_todo_guests.findFirst({
    where: { fingerprint_hash: fingerprint_hash },
  });
  if (existingGuest !== null) {
    if (existingGuest.deleted_at !== null) {
      // Reactivate deleted guest
      await MyGlobal.prisma.multi_user_todo_guests.update({
        where: { id: existingGuest.id },
        data: {
          deleted_at: null,
          status: "active" as const,
          updated_at: new Date(),
        },
      });
    } else {
      throw new HttpException("Guest already exists", 409);
    }
  }
  // Generate UUIDs
  const guestId: string & tags.Format<"uuid"> = v4();
  const sessionId: string & tags.Format<"uuid"> = v4();
  // Calculate expiration times as string & Format<'date-time'>
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Create guest record
  const guest = await MyGlobal.prisma.multi_user_todo_guests.create({
    data: {
      id: guestId,
      fingerprint_hash: fingerprint_hash,
      user_agent: null,
      ip_address: props.body.ip ?? props.ip ?? null,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    select: {
      id: true,
      fingerprint_hash: true,
      user_agent: true,
      ip_address: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Create session record
  await MyGlobal.prisma.multi_user_todo_guest_sessions.create({
    data: {
      id: sessionId,
      multi_user_todo_guest_id: guest.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  // Generate JWT tokens
  const access_token: string = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh_token: string = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Calculate sessions count
  const sessions_count: number & tags.Type<"int32"> =
    await MyGlobal.prisma.multi_user_todo_guest_sessions.count({
      where: { multi_user_todo_guest_id: guest.id },
    });
  // Return IAuthorized
  return {
    id: guest.id,
    fingerprint_hash: guest.fingerprint_hash,
    user_agent: guest.user_agent,
    ip_address: guest.ip_address,
    status: guest.status as "active" | "deleted" | "expired",
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at:
      guest.deleted_at !== null ? toISOStringSafe(guest.deleted_at) : null,
    sessions_count: sessions_count,
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IMultiUserTodoGuest.IAuthorized;
}
