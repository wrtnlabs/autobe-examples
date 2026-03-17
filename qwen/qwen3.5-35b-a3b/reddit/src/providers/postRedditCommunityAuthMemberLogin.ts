import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthMemberLogin(props: {
  ip: string;
  body: IRedditCommunityMember.ILogin;
}): Promise<IRedditCommunityMember.IAuthorized> {
  const member = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      username: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 401);
  }
  const passwordMatch = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!passwordMatch) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session: {
    id: string;
    created_at: Date;
  } = await MyGlobal.prisma.reddit_community_member_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member_id: member.id,
      access_token: "",
      refresh_token: "",
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      expired_at: accessExpires,
    },
  });
  const accessToken: string = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.reddit_community_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      updated_at: new Date(),
    },
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires) as string &
      tags.Format<"date-time">,
    refreshable_until: toISOStringSafe(refreshExpires) as string &
      tags.Format<"date-time">,
  };
  return {
    token,
  } satisfies IRedditCommunityMember.IAuthorized;
}
