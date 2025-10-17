import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorLogin(props: {
  body: ICommunityPortalModerator.ILogin;
}): Promise<ICommunityPortalModerator.IAuthorized> {
  const { body } = props;

  const user = await MyGlobal.prisma.community_portal_users.findFirst({
    where: {
      OR: [{ username: body.identifier }, { email: body.identifier }],
      deleted_at: null,
    },
    include: { community_portal_members: true },
  });

  // Avoid disclosing whether the identifier exists
  if (!user) throw new HttpException("Invalid credentials", 401);

  const isValid = await PasswordUtil.verify(body.password, user.password_hash);
  if (!isValid) throw new HttpException("Invalid credentials", 401);

  const member = user.community_portal_members ?? null;
  if (!member)
    throw new HttpException("Unauthorized: member record not found", 403);
  if (!member.is_email_verified)
    throw new HttpException("Email not verified", 403);
  if (member.is_suspended)
    throw new HttpException("Unauthorized: account suspended", 403);

  const nowMs = Date.now();
  const accessMs = 60 * 60 * 1000; // 1 hour
  const refreshMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  const expiredAt = toISOStringSafe(new Date(nowMs + accessMs));
  const refreshableUntil = toISOStringSafe(new Date(nowMs + refreshMs));

  const accessToken = jwt.sign(
    { id: user.id, type: "moderator", username: user.username },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { id: user.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: user.id as string & tags.Format<"uuid">,
    username: user.username,
    display_name: user.display_name ?? undefined,
    karma: Number(user.karma) as number & tags.Type<"int32">,
    avatar_uri: user.avatar_uri ?? undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
