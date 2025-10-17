import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberLogin(props: {
  body: ICommunityPortalMember.ILogin;
}): Promise<ICommunityPortalMember.IAuthorized> {
  const { body } = props;

  // Locate user by username OR email (identifier may be either)
  const user = await MyGlobal.prisma.community_portal_users.findFirst({
    where: {
      OR: [{ username: body.identifier }, { email: body.identifier }],
    },
    include: {
      community_portal_members: true,
    },
  });

  // Generic failure to avoid user enumeration
  if (!user) throw new HttpException("Unauthorized", 401);

  // Verify password using PasswordUtil
  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    user.password_hash,
  );
  if (!isPasswordValid) throw new HttpException("Unauthorized", 401);

  const member = user.community_portal_members ?? null;

  // If member record indicates suspension, forbid access
  if (member && member.is_suspended) {
    throw new HttpException("Forbidden", 403);
  }

  // Prepare token payload and generate tokens
  const jwtPayload = { id: user.id, type: "member" };
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refreshToken = jwt.sign(
    { id: user.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Compute ISO timestamps for token expirations
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Build authorized response (omit sensitive fields)
  return {
    id: user.id as string & tags.Format<"uuid">,
    username: user.username,
    display_name: user.display_name ?? null,
    karma: user.karma as number & tags.Type<"int32">,
    avatar_uri: user.avatar_uri ?? null,
    created_at: user.created_at ? toISOStringSafe(user.created_at) : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
