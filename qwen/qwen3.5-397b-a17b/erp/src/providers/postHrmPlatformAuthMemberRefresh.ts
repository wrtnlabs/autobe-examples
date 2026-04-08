import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformMemberTransformer } from "../transformers/HrmPlatformMemberTransformer";
import { HrmPlatformUserProfileTransformer } from "../transformers/HrmPlatformUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAuthMemberRefresh(props: {
  body: IHrmPlatformMember.IRefresh;
}): Promise<IHrmPlatformMember.IAuthorized> {
  let decoded: {
    type: string;
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    created_at: string & tags.Format<"date-time">;
  } | null = null;
  try {
    const verified = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof verified !== "object" || verified === null) {
      throw new HttpException("Invalid token format", 401);
    }
    const token = verified as Record<string, unknown>;
    if (
      typeof token.type !== "string" ||
      typeof token.id !== "string" ||
      typeof token.session_id !== "string" ||
      typeof token.created_at !== "string"
    ) {
      throw new HttpException("Invalid token claims", 401);
    }
    decoded = {
      type: token.type,
      id: token.id as string & tags.Format<"uuid">,
      session_id: token.session_id as string & tags.Format<"uuid">,
      created_at: token.created_at as string & tags.Format<"date-time">,
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded === null || decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      refresh_token: props.body.refresh_token,
      hrm_platform_member_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 401);
  }
  const currentTimestamp = new Date().toISOString();
  const expiredTimestamp = session.expired_at.toISOString();
  if (expiredTimestamp < currentTimestamp) {
    throw new HttpException("Session expired", 401);
  }
  const member = await MyGlobal.prisma.hrm_platform_members.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const tokenCreatedAt = toISOStringSafe(new Date());
  const access = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.hrm_platform_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: access,
      refresh_token: refresh,
      expired_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      updated_at: new Date(),
    },
  });
  const memberData =
    await MyGlobal.prisma.hrm_platform_members.findUniqueOrThrow({
      where: { id: decoded.id },
      ...HrmPlatformMemberTransformer.select(),
    });
  return {
    id: memberData.id,
    email: memberData.email,
    created_at: toISOStringSafe(memberData.created_at),
    updated_at: toISOStringSafe(memberData.updated_at),
    deleted_at: memberData.deleted_at
      ? toISOStringSafe(memberData.deleted_at)
      : null,
    profile: memberData.profile
      ? await HrmPlatformUserProfileTransformer.transform(memberData.profile)
      : null,
    token: {
      access: access,
      refresh: refresh,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
