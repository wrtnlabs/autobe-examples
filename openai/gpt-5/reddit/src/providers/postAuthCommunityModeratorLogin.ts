import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityModeratorLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorLogin";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCommunityModeratorLogin(props: {
  body: ICommunityPlatformCommunityModeratorLogin.IRequest;
}): Promise<ICommunityPlatformCommunityModerator.IAuthorized> {
  const { body } = props;

  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      deleted_at: null,
      ...("email" in body
        ? { email: body.email }
        : { username: body.username }),
    },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  const isValid = await PasswordUtil.verify(body.password, user.password_hash);
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  if (!user.email_verified) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (user.account_state !== "Active") {
    throw new HttpException("Invalid credentials", 401);
  }

  const nowIso = toISOStringSafe(new Date());
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 20 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  );

  await MyGlobal.prisma.community_platform_users.update({
    where: { id: user.id },
    data: {
      last_login_at: nowIso,
      updated_at: nowIso,
    },
  });

  const payload = {
    id: user.id as string & tags.Format<"uuid">,
    type: "communityModerator" as const,
  };

  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "20m",
    issuer: "autobe",
  });
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "14d",
    issuer: "autobe",
  });

  return {
    id: user.id as string & tags.Format<"uuid">,
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
    role: "communityModerator",
  };
}
