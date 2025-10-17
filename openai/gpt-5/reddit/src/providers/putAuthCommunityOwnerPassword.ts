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
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";

export async function putAuthCommunityOwnerPassword(props: {
  communityOwner: CommunityownerPayload;
  body: ICommunityPlatformCommunityOwner.IChangePassword;
}): Promise<ICommunityPlatformCommunityOwner.IAuthorized> {
  const { communityOwner, body } = props;

  if (!communityOwner) {
    throw new HttpException("Unauthorized", 401);
  }

  const user = await MyGlobal.prisma.community_platform_users.findUniqueOrThrow(
    {
      where: { id: communityOwner.id },
      select: {
        id: true,
        password_hash: true,
        account_state: true,
        deleted_at: true,
      },
    },
  );

  if (user.deleted_at !== null) {
    throw new HttpException("Forbidden: account is deleted", 403);
  }

  const disallowedStates = new Set([
    "Locked",
    "Deactivated",
    "PendingDeletion",
    "Deleted",
    "Banned",
  ]);
  if (disallowedStates.has(user.account_state)) {
    throw new HttpException(
      "Forbidden: account state does not allow password change",
      403,
    );
  }

  const ok = await PasswordUtil.verify(
    body.current_password,
    user.password_hash,
  );
  if (!ok) {
    throw new HttpException("Bad Request: invalid current password", 400);
  }

  const newHash = await PasswordUtil.hash(body.new_password);
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  await MyGlobal.prisma.community_platform_users.update({
    where: { id: user.id },
    data: {
      password_hash: newHash,
      updated_at: now,
      last_login_at: now,
    },
    select: { id: true },
  });

  const accessTtlSeconds = 60 * 60; // 1 hour
  const refreshTtlSeconds = 60 * 60 * 24 * 30; // 30 days

  const accessExp = Math.floor(Date.now() / 1000) + accessTtlSeconds;
  const refreshExp = Math.floor(Date.now() / 1000) + refreshTtlSeconds;

  const signingKey = MyGlobal.env.JWT_SECRET_KEY;

  const access = jwt.sign(
    { sub: communityOwner.id, type: "communityowner", exp: accessExp },
    signingKey,
  );
  const refresh = jwt.sign(
    { sub: communityOwner.id, type: "communityowner", exp: refreshExp },
    signingKey,
  );

  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: toISOStringSafe(new Date(Date.now() + accessTtlSeconds * 1000)),
    refreshable_until: toISOStringSafe(
      new Date(Date.now() + refreshTtlSeconds * 1000),
    ),
  };

  return {
    id: communityOwner.id,
    token,
    role: "communityOwner",
  };
}
