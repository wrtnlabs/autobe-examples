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

export async function postHrmPlatformAuthMemberLogin(props: {
  ip: string;
  body: IHrmPlatformMember.ILogin;
}): Promise<IHrmPlatformMember.IAuthorized> {
  // 1. Find member by email with password_hash explicitly selected
  const member = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: { email: props.body.email },
    select: {
      ...HrmPlatformMemberTransformer.select().select,
      password_hash: true,
    },
  });
  // 2. Check if member exists and is not soft-deleted
  if (!member || member.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Verify email is confirmed (check for used verification token)
  const emailVerification =
    await MyGlobal.prisma.hrm_platform_member_email_verifications.findFirst({
      where: {
        member_id: member.id,
        used_at: { not: null },
      },
    });
  if (!emailVerification) {
    throw new HttpException("Email not verified", 403);
  }
  // 4. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 5. Generate session ID and timestamps
  const session_id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // 6. Generate JWT tokens
  const access_token = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh_token = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Create session record
  await MyGlobal.prisma.hrm_platform_member_sessions.create({
    data: {
      id: v4(),
      hrm_platform_member_id: member.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      access_token,
      refresh_token,
      created_at: now,
      updated_at: now,
      expired_at: refreshExpires,
    },
  });
  // 8. Build token response
  const token: IAuthorizationToken = {
    access: access_token,
    refresh: refresh_token,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 9. Return IAuthorized response
  return {
    ...(await HrmPlatformMemberTransformer.transform(member)),
    token,
  } satisfies IHrmPlatformMember.IAuthorized;
}
