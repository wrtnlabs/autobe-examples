import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserJoin(props: {
  body: ITodoListUser.IJoin;
}): Promise<ITodoListUser.IAuthorized> {
  // Step 1: Duplicate email check (exclude soft-deleted)
  const existing = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (existing) {
    throw new HttpException("Email already registered.", 409);
  }

  // Step 2: Prepare all time values and IDs
  const now = toISOStringSafe(new Date());
  const userId = v4();
  const sessionId = v4();
  const verificationToken = v4(); // using uuid strategy for OTK
  const emailVerificationSentAt = now;

  // Step 3: Password hashing
  const passwordHash = await PasswordUtil.hash(props.body.password);

  // Step 4: User record insert
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash: passwordHash,
      is_verified: false,
      email_verification_token: verificationToken,
      email_verification_sent_at: emailVerificationSentAt,
      reset_password_token: null,
      reset_password_sent_at: null,
      locked: false,
      locked_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Step 5: Session insert
  const sessionData: any = {
    id: sessionId,
    todo_list_user_id: userId,
    href: props.body.href,
    referrer: props.body.referrer,
    created_at: now,
    expired_at: null,
  };
  if (props.body.ip !== null && props.body.ip !== undefined) {
    sessionData.ip = props.body.ip satisfies string as string;
  }
  await MyGlobal.prisma.todo_list_user_sessions.create({
    data: sessionData,
  });

  // Step 6: JWT token creation (all issued now)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: userId,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: userId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Step 7: Return - map output strictly to IAuthorized (respect null/undefined)
  return {
    id: user.id,
    email: user.email,
    is_verified: user.is_verified,
    locked: user.locked,
    locked_at: user.locked_at ? toISOStringSafe(user.locked_at) : null,
    email_verification_token: user.email_verification_token ?? null,
    email_verification_sent_at: user.email_verification_sent_at
      ? toISOStringSafe(user.email_verification_sent_at)
      : null,
    reset_password_token: user.reset_password_token ?? null,
    reset_password_sent_at: user.reset_password_sent_at
      ? toISOStringSafe(user.reset_password_sent_at)
      : null,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token,
  };
}
