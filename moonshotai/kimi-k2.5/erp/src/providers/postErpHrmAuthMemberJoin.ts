import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmMemberSessionTransformer } from "../transformers/ErpHrmMemberSessionTransformer";
import { ErpHrmMemberTransformer } from "../transformers/ErpHrmMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthMemberJoin(props: {
  ip: string;
  body: IErpHrmMember.IJoin;
}): Promise<IErpHrmMember.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create member with hashed password
  const member = await MyGlobal.prisma.erp_hrm_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      first_name: props.body.firstName,
      last_name: props.body.lastName,
      avatar_url: props.body.avatarUrl,
      timezone: props.body.timezone,
      locale: props.body.locale,
      email_verified_at: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
    ...ErpHrmMemberTransformer.select(),
  });
  // 3. Create email verification token
  const verificationToken = v4() as string & tags.Format<"uuid">;
  const verificationExpires = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.erp_hrm_member_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      erp_hrm_member_id: member.id,
      email: props.body.email,
      token: verificationToken,
      expires_at: verificationExpires,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      verified_at: null,
    },
  });
  // 4. Create session
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      erp_hrm_member_id: member.id,
      access_token: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: v4() as string & tags.Format<"uuid">,
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh_token: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: v4() as string & tags.Format<"uuid">,
          tokenType: "refresh",
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: refreshExpires,
    },
    ...ErpHrmMemberSessionTransformer.select(),
  });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 6. Return authorized member
  const transformedMember = await ErpHrmMemberTransformer.transform(member);
  return {
    ...transformedMember,
    avatarUrl: transformedMember.avatarUrl satisfies
      | (string & tags.Format<"uri">)
      | null as (string & tags.Format<"url">) | null,
    token,
  } satisfies IErpHrmMember.IAuthorized;
}
