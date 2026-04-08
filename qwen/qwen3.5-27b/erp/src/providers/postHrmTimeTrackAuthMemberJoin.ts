import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackAuthMemberJoin(props: {
  ip: string;
  body: IHrmTimeTrackMember.IJoin;
}): Promise<IHrmTimeTrackMember.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.hrm_time_track_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create member record
  const now = new Date();
  const memberId = v4();
  const member = await MyGlobal.prisma.hrm_time_track_members.create({
    data: {
      id: memberId,
      email: props.body.email.toLowerCase(),
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 4. Generate email verification token
  const verificationToken = v4();
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.hrm_time_track_member_email_verifications.create({
    data: {
      id: v4(),
      hrm_time_track_member_id: member.id,
      token: verificationToken,
      email: props.body.email,
      created_at: now,
      expired_at: verificationExpires,
      used_at: null,
      deleted_at: null,
    },
  });
  // 5. Generate JWT tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: member.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: member.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 6. Return IAuthorized response
  return {
    id: member.id,
    email: member.email,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at: member.deleted_at?.toISOString() ?? null,
    token,
  };
}
