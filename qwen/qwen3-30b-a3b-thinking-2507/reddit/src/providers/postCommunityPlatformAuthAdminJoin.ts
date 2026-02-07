import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformAdminCollector } from "../collectors/CommunityPlatformAdminCollector";
import { CommunityPlatformAdminSessionCollector } from "../collectors/CommunityPlatformAdminSessionCollector";
import { CommunityPlatformAdminSessionTransformer } from "../transformers/CommunityPlatformAdminSessionTransformer";
import { CommunityPlatformAdminTransformer } from "../transformers/CommunityPlatformAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthAdminJoin(props: {
  body: ICommunityPlatformAdmin.IJoin;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const existingAdmin =
    await MyGlobal.prisma.community_platform_admins.findFirst({
      where: { email: props.body.email },
    });
  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }
  const admin = await MyGlobal.prisma.community_platform_admins.create({
    data: await CommunityPlatformAdminCollector.collect({
      body: props.body,
    }),
    ...CommunityPlatformAdminTransformer.select(),
  });
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.community_platform_admin_sessions.create({
      data: await CommunityPlatformAdminSessionCollector.collect({
        body: props.body,
        communityPlatformAdmin: { id: admin.id },
        ip: props.ip,
      }),
      ...CommunityPlatformAdminSessionTransformer.select(),
    });
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    ...(await CommunityPlatformAdminTransformer.transform(admin)),
    token,
  } satisfies ICommunityPlatformAdmin.IAuthorized;
}
