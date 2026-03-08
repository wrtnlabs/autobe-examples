import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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

export async function postDiscussionBoardAuthSuperAdminJoin(props: {
  body: IDiscussionBoardSuperAdmin.IJoin;
}): Promise<IDiscussionBoardSuperAdmin.IAuthorized> {
  // 1. Check duplicate email
  const existing =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: { email: props.body.email },
    });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Create super admin
  const admin = await MyGlobal.prisma.discussion_board_super_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name ?? null,
      bio: props.body.bio ?? null,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  // 3. Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.create({
      data: {
        id: v4(),
        discussion_board_super_admin_id: admin.id,
        access_token: "",
        refresh_token: "",
        ip: "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
        expired_at: accessExpires.toISOString() as string &
          tags.Format<"date-time">,
      },
    });
  // 4. Generate JWT tokens
  const tokenPayload = {
    type: "superAdmin",
    id: admin.id,
    session_id: session.id,
    created_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  const access = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    {
      ...tokenPayload,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 5. Return authorized response
  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    token,
    authorizationActor: "superAdmin" as const,
  } satisfies IDiscussionBoardSuperAdmin.IAuthorized;
}
