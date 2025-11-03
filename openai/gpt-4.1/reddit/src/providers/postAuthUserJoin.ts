import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserJoin(props: {
  body: ICommunityPlatformUser.IJoin;
}): Promise<ICommunityPlatformUser.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.community_platform_users.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // 2. Securely hash the password
  const password_hash = await PasswordUtil.hash(props.body.password);

  // 3. Create user in database
  const user = await MyGlobal.prisma.community_platform_users.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash,
      display_name: props.body.display_name,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  // 4. Create verification token (24h expiry)
  const expires_at = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.community_platform_user_verification_tokens.create({
    data: {
      id: v4(),
      community_platform_user_id: user.id,
      token: v4(),
      expires_at,
      consumed: false,
      created_at: toISOStringSafe(new Date()),
      consumed_at: null,
    },
  });

  // 5. Return authorized DTO with dummy token structure
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: null,
    token: {
      access: "",
      refresh: "",
      expired_at: expires_at,
      refreshable_until: expires_at,
    },
  };
}
