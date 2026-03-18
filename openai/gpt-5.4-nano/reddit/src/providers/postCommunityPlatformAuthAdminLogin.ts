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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthAdminLogin(props: {
  ip: string;
  body: ICommunityPlatformAdmin.ILogin;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const fail = () => {
    throw new HttpException("Invalid credentials", 401);
  };
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!admin) fail();
  const ok = await PasswordUtil.verify(
    props.body.password,
    admin!.password_hash,
  );
  if (!ok) fail();
  const adminId = admin!.id;
  const nowIso = toISOStringSafe(new Date());
  const accessExpiresIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntilIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session =
    await MyGlobal.prisma.community_platform_admin_sessions.create({
      data: {
        id: v4(),
        admin_id: adminId,
        ip: props.ip,
        created_at: nowIso,
        updated_at: nowIso,
        expired_at: accessExpiresIso,
        href: "",
        referrer: "",
        deleted_at: null,
      },
    });
  const access = jwt.sign(
    {
      type: "admin",
      id: adminId,
      session_id: session.id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "admin",
      id: adminId,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: adminId,
    email: admin!.email,
    created_at: toISOStringSafe(admin!.created_at),
    updated_at: toISOStringSafe(admin!.updated_at),
    deleted_at: admin!.deleted_at ? toISOStringSafe(admin!.deleted_at) : null,
    token: {
      access,
      refresh,
      expired_at: accessExpiresIso,
      refreshable_until: refreshableUntilIso,
    },
  };
}
