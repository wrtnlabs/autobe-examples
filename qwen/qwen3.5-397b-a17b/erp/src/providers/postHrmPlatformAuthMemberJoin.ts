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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAuthMemberJoin(props: {
  ip: string;
  body: IHrmPlatformMember.IJoin;
}): Promise<IHrmPlatformMember.IAuthorized> {
  const existing = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const memberId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(v4());
  const now = new Date();
  const member = await MyGlobal.prisma.hrm_platform_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...HrmPlatformMemberTransformer.select(),
  });
  const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(v4());
  const accessPayload = {
    type: "member",
    id: memberId,
    session_id: sessionId,
    created_at: new Date().toISOString(),
  };
  const refreshPayload = {
    type: "member",
    id: memberId,
    session_id: sessionId,
    tokenType: "refresh",
    created_at: new Date().toISOString(),
  };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  await MyGlobal.prisma.hrm_platform_member_sessions.create({
    data: {
      id: sessionId,
      hrm_platform_member_id: memberId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      access_token: accessToken,
      refresh_token: refreshToken,
      created_at: new Date(),
      updated_at: new Date(),
      expired_at: accessExpiresAt,
    },
  });
  const verificationToken: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(v4());
  const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.hrm_platform_member_email_verifications.create({
    data: {
      id: typia.assert<string & tags.Format<"uuid">>(v4()),
      member_id: memberId,
      employee_invitation_id: null,
      email: props.body.email,
      token: verificationToken,
      expires_at: verificationExpiresAt,
      used_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresAt.toISOString(),
    refreshable_until: refreshExpiresAt.toISOString(),
  };
  const transformed = await HrmPlatformMemberTransformer.transform(member);
  return {
    id: transformed.id,
    email: transformed.email,
    created_at: transformed.created_at,
    updated_at: transformed.updated_at,
    deleted_at: transformed.deleted_at,
    profile: transformed.profile,
    token,
  } satisfies IHrmPlatformMember.IAuthorized;
}
