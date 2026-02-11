import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityAdminTransformer } from "../transformers/CommunityAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAuthAdminLogin(props: {
  body: ICommunityAdmin.ILogin;
}): Promise<ICommunityAdmin.IAuthorized> {
  const admin = await MyGlobal.prisma.community_admins.findFirst({
    where: { email: props.body.email },
    select: {
      ...CommunityAdminTransformer.select().select,
      password: true,
    },
  });
  if (!admin) throw new HttpException("Invalid credentials", 401);
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  const accessExpires = new Date(Date.now() + 60 * 15 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.community_admin_sessions.create({
    data: {
      id: v4(),
      community_admin_id: admin.id,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
      ip: "",
      href: "",
      referrer: "",
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  const transformedAdmin = await CommunityAdminTransformer.transform(admin);
  transformedAdmin.deleted_at = transformedAdmin.deleted_at ?? null;
  return {
    ...transformedAdmin,
    token,
  };
}
