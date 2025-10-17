import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorLogin(props: {
  body: ICommunityPlatformModerator.ILogin;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  const loginAttemptedAt = toISOStringSafe(new Date());
  let actorId: string | undefined = undefined;
  let auditSuccess = false;
  try {
    // Lookup moderator (active, not deleted, by exact email)
    const moderator =
      await MyGlobal.prisma.community_platform_moderators.findFirst({
        where: {
          email: props.body.email,
          deleted_at: null,
          status: "active",
        },
        include: {
          member: true,
        },
      });
    if (!moderator || !moderator.member || !moderator.member.email_verified) {
      throw new HttpException("Invalid credentials", 401);
    }
    actorId = moderator.id;
    const isPasswordValid = await PasswordUtil.verify(
      props.body.password,
      moderator.password_hash,
    );
    if (!isPasswordValid) {
      throw new HttpException("Invalid credentials", 401);
    }
    // Generate tokens
    const now = Date.now();
    const accessExpireTime = toISOStringSafe(new Date(now + 60 * 60 * 1000));
    const refreshExpireTime = toISOStringSafe(
      new Date(now + 7 * 24 * 60 * 60 * 1000),
    );
    const tokenPayload = { id: moderator.id, type: "moderator" };
    const access = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    });
    const refresh = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
      issuer: "autobe",
    });
    const response: ICommunityPlatformModerator.IAuthorized = {
      id: moderator.id,
      member_id: moderator.member_id,
      community_id: moderator.community_id,
      email: moderator.email,
      status: moderator.status,
      created_at: toISOStringSafe(moderator.created_at),
      updated_at: toISOStringSafe(moderator.updated_at),
      ...(moderator.deleted_at !== null && moderator.deleted_at !== undefined
        ? { deleted_at: toISOStringSafe(moderator.deleted_at) }
        : {}),
      token: {
        access,
        refresh,
        expired_at: accessExpireTime,
        refreshable_until: refreshExpireTime,
      },
    };
    auditSuccess = true;
    return response;
  } finally {
    // Log all login attempts
    await MyGlobal.prisma.community_platform_audit_logs.create({
      data: {
        id: v4(),
        actor_type: "moderator",
        actor_id: actorId ?? "00000000-0000-0000-0000-000000000000",
        action_type: "login",
        target_table: "community_platform_moderators",
        target_id: actorId,
        details: JSON.stringify({
          email: props.body.email,
          success: auditSuccess,
        }),
        created_at: loginAttemptedAt,
      },
    });
  }
}
