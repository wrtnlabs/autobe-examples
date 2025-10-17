import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminJoin(props: {
  body: IRedditLikeAdmin.ICreate;
}): Promise<IRedditLikeAdmin.IAuthorized> {
  const { body } = props;

  const existingUsername = await MyGlobal.prisma.reddit_like_admins.findUnique({
    where: { username: body.username },
  });

  if (existingUsername) {
    throw new HttpException("Username already exists", 409);
  }

  const existingEmail = await MyGlobal.prisma.reddit_like_admins.findUnique({
    where: { email: body.email },
  });

  if (existingEmail) {
    throw new HttpException("Email already exists", 409);
  }

  const hashedPassword = await PasswordUtil.hash(body.password);
  const adminId = v4() as string & tags.Format<"uuid">;
  const currentTimestamp = Date.now();

  const currentISOTime = toISOStringSafe(new Date(currentTimestamp));

  const newAdmin = await MyGlobal.prisma.reddit_like_admins.create({
    data: {
      id: adminId,
      username: body.username,
      email: body.email,
      password_hash: hashedPassword,
      email_verified: false,
      profile_bio: null,
      avatar_url: null,
      super_admin: false,
      created_at: currentISOTime,
      updated_at: currentISOTime,
      deleted_at: null,
    },
  });

  const accessExpireTimestamp = currentTimestamp + 30 * 60 * 1000;
  const refreshExpireTimestamp = currentTimestamp + 30 * 24 * 60 * 60 * 1000;

  const accessToken = jwt.sign(
    {
      id: newAdmin.id,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: newAdmin.id,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  return {
    id: newAdmin.id as string & tags.Format<"uuid">,
    username: newAdmin.username,
    email: newAdmin.email as string & tags.Format<"email">,
    email_verified: newAdmin.email_verified,
    is_super_admin: newAdmin.super_admin,
    profile_bio: newAdmin.profile_bio ?? undefined,
    avatar_url: newAdmin.avatar_url ?? undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(accessExpireTimestamp)),
      refreshable_until: toISOStringSafe(new Date(refreshExpireTimestamp)),
    },
  };
}
