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
    where: { email: props.body.email, deleted_at: null },
    select: {
      id: true,
      email: true,
      username: true,
      created_at: true,
      updated_at: true,
      password_hash: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpiresTime: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpiresTime: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const nowTime: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const sessionId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  const session = await MyGlobal.prisma.reddit_community_member_sessions.create(
    {
      data: {
        id: sessionId,
        member_id: member.id,
        access_token: "",
        refresh_token: "",
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: nowTime,
        updated_at: nowTime,
        expired_at: accessExpiresTime,
      },
    },
  );
  const payloadForAccess = {
    type: "member" as const,
    id: member.id,
    session_id: sessionId,
    created_at: nowTime,
  };
  const payloadForRefresh = {
    type: "member" as const,
    id: member.id,
    session_id: sessionId,
    tokenType: "refresh" as const,
    created_at: nowTime,
  };
  const access: string = jwt.sign(
    payloadForAccess,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh: string = jwt.sign(
    payloadForRefresh,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.reddit_community_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: access,
      refresh_token: refresh,
    },
  });
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpiresTime,
    refreshable_until: refreshExpiresTime,
  };
  return {
    token,
  } satisfies IRedditCommunityMember.IAuthorized;
}
