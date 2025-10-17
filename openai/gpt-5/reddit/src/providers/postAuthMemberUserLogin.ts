import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberUserLogin(props: {
  body: ICommunityPlatformMemberUser.ILogin;
}): Promise<ICommunityPlatformMemberUser.IAuthorized> {
  const { body } = props;

  // Normalize nullable union inputs to undefined for conditional query building
  const email = body.email === null ? undefined : body.email;
  const username = body.username === null ? undefined : body.username;

  // Find user by email or username, excluding soft-deleted
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      AND: [
        { deleted_at: null },
        {
          OR: [
            ...(email !== undefined ? [{ email }] : []),
            ...(username !== undefined ? [{ username }] : []),
          ],
        },
      ],
    },
  });

  if (!user) {
    throw new HttpException("Unauthorized: Invalid credentials", 401);
  }

  const valid = await PasswordUtil.verify(body.password, user.password_hash);
  if (!valid) {
    throw new HttpException("Unauthorized: Invalid credentials", 401);
  }

  // Account state checks per business policy
  const deniedStates = [
    "Locked",
    "Deactivated",
    "PendingDeletion",
    "Deleted",
    "Banned",
  ];
  if (deniedStates.includes(user.account_state)) {
    throw new HttpException(
      "Forbidden: Account is not permitted to login",
      403,
    );
  }

  // Update audit fields
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_users.update({
    where: { id: user.id },
    data: {
      last_login_at: now,
      updated_at: now,
    },
  });

  // JWT payload per MemberuserPayload contract
  const accessToken = jwt.sign(
    { id: user.id as string & tags.Format<"uuid">, type: "memberuser" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: user.id as string & tags.Format<"uuid">, type: "memberuser" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  return {
    id: user.id as string & tags.Format<"uuid">,
    username: user.username,
    display_name: user.display_name ?? undefined,
    avatar_uri: user.avatar_uri ?? undefined,
    email_verified: user.email_verified,
    account_state: user.account_state,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt as string & tags.Format<"date-time">,
      refreshable_until: refreshableUntil as string & tags.Format<"date-time">,
    },
  };
}
