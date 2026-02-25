import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditAuthMemberJoin(props: {
  body: IRedditMember.IJoin;
}): Promise<IRedditMember.IAuthorized> {
  // 1. Check email duplication
  const existing = await MyGlobal.prisma.reddit_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Create member record
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const member = await MyGlobal.prisma.reddit_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });
  // 3. Create email verification token
  const verificationToken = v4();
  await MyGlobal.prisma.reddit_member_email_verifications.create({
    data: {
      id: v4(),
      token: verificationToken,
      expires_at: toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      member: { connect: { id: member.id } },
    },
  });
  // 4. Generate JWT tokens (1h access, 7d refresh)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: v4(),
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: v4(),
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 5. Return IAuthorized structure
  return {
    ...member,
    token,
  } satisfies IRedditMember.IAuthorized;
}
