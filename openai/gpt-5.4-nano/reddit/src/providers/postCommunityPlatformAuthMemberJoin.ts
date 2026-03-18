import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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

export async function postCommunityPlatformAuthMemberJoin(props: {
  ip: string;
  body: ICommunityPlatformMember.IJoin;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  const nowIso = await toISOStringSafe(new Date());
  const member = await MyGlobal.prisma.community_platform_members.findFirst({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (member) {
    throw new HttpException("Email already registered", 409);
  }
  const createdMember = await MyGlobal.prisma.community_platform_members.create(
    {
      data: {
        id: v4() as never,
        email: props.body.email,
        password_hash: await PasswordUtil.hash(props.body.password),
        created_at: nowIso as any,
        updated_at: nowIso as any,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  const sessionAccessExpires = await toISOStringSafe(new Date());
  const sessionRefreshExpires = await toISOStringSafe(new Date());
  const session =
    await MyGlobal.prisma.community_platform_member_sessions.create({
      data: {
        id: v4() as never,
        community_platform_member_id: createdMember.id,
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: nowIso as any,
        updated_at: nowIso as any,
        deleted_at: null,
        expired_at: sessionAccessExpires as any,
      },
      select: { id: true },
    });
  const access = jwt.sign(
    {
      type: "member",
      id: createdMember.id,
      session_id: session.id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "member",
      id: createdMember.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: createdMember.id,
    token: {
      access,
      refresh,
      expired_at: sessionAccessExpires,
      refreshable_until: sessionRefreshExpires,
    },
  } as any;
}
