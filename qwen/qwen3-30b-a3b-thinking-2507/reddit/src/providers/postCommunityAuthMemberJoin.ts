import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAuthMemberJoin(props: {
  body: ICommunityMember.IJoin;
}): Promise<ICommunityMember.IAuthorized> {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(props.body.email)) {
    throw new HttpException("Invalid email format", 400);
  }
  const existingUser = await MyGlobal.prisma.community_members.findFirst({
    where: { username: props.body.username },
  });
  if (existingUser) {
    throw new HttpException("Username already exists", 409);
  }
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const createdMember = await MyGlobal.prisma.community_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      username: props.body.username,
      password_hash: passwordHash,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const verificationToken = v4();
  const tokenExpires = new Date();
  tokenExpires.setDate(tokenExpires.getDate() + 1);
  await MyGlobal.prisma.community_member_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      token: verificationToken,
      expires_at: toISOStringSafe(tokenExpires),
      created_at: toISOStringSafe(new Date()),
      status: "pending",
      user_id: createdMember.id,
    },
  });
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.community_member_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_member_id: createdMember.id,
      ip: "127.0.0.1",
      access_token: v4(),
      refresh_token: v4(),
      access_expired_at: toISOStringSafe(accessExpires),
      refresh_expired_at: toISOStringSafe(refreshExpires),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const tokenPayload = {
    type: "member",
    id: createdMember.id,
    session_id: session.id,
  };
  const token = {
    access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      { ...tokenPayload, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: createdMember.id,
    email: createdMember.email,
    username: createdMember.username,
    display_name: createdMember.display_name,
    bio: createdMember.bio,
    avatar_url: createdMember.avatar_url,
    created_at: toISOStringSafe(createdMember.created_at),
    updated_at: toISOStringSafe(createdMember.updated_at),
    deleted_at: createdMember.deleted_at
      ? toISOStringSafe(createdMember.deleted_at)
      : null,
    access: token.access,
    refresh: token.refresh,
    expired_at: token.expired_at,
    token,
  } satisfies ICommunityMember.IAuthorized;
}
