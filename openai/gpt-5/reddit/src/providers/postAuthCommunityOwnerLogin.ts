import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCommunityOwnerLogin(props: {
  body: ICommunityPlatformCommunityOwner.ILogin;
}): Promise<ICommunityPlatformCommunityOwner.IAuthorized> {
  const { body } = props;

  const hasEmail = body && body.email !== undefined && body.email !== null;
  const hasUsername =
    body && body.username !== undefined && body.username !== null;
  if (!hasEmail && !hasUsername) {
    throw new HttpException("Invalid credentials", 401);
  }

  const user = hasEmail
    ? await MyGlobal.prisma.community_platform_users.findFirst({
        where: {
          email: body.email,
          deleted_at: null,
        },
      })
    : await MyGlobal.prisma.community_platform_users.findFirst({
        where: {
          username: body.username,
          deleted_at: null,
        },
      });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  const valid = await PasswordUtil.verify(body.password, user.password_hash);
  if (!valid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const blockedStates = [
    "Locked",
    "Deactivated",
    "PendingDeletion",
    "Deleted",
    "Banned",
  ];
  if (blockedStates.includes(user.account_state)) {
    throw new HttpException("Invalid credentials", 401);
  }

  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_users.update({
    where: { id: user.id },
    data: {
      last_login_at: now,
      updated_at: now,
    },
  });

  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    {
      id: user.id,
      type: "communityowner",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      id: user.id,
      type: "communityowner",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: user.id as string & tags.Format<"uuid">,
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
    role: "communityOwner",
  };
}
