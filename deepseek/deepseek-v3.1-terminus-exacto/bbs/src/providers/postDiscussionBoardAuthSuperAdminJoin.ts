import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
  // 1. Check for duplicate email
  const existing =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: { email: props.body.email, deleted_at: null },
    });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Create super admin record
  const superAdminId = v4() as string & tags.Format<"uuid">;
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const superAdmin = await MyGlobal.prisma.discussion_board_super_admins.create(
    {
      data: {
        id: superAdminId,
        email: props.body.email,
        password_hash: passwordHash,
        privilege_level: "super",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
    },
  );
  // 3. Create session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.create({
      data: {
        id: sessionId,
        discussion_board_super_admin_id: superAdminId,
        access_token: "", // Will be replaced with JWT
        refresh_token: "", // Will be replaced with JWT
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        expired_at: accessExpires.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  // 4. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "superadmin",
      id: superAdminId,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "superadmin",
      id: superAdminId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Update session with actual tokens
  await MyGlobal.prisma.discussion_board_super_admin_sessions.update({
    where: { id: sessionId },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      updated_at: new Date().toISOString(),
    },
  });
  // 6. Return authorized response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  return {
    id: superAdminId,
    permission_level: "super",
    assignment_date: new Date().toISOString() as string &
      tags.Format<"date-time">,
    admin: null,
    superAdmin: null,
    section: {
      id: v4() as string & tags.Format<"uuid">,
      name: "",
      description: "",
      status: "",
      display_order: 0 as number & tags.Type<"int32">,
    } satisfies IDiscussionBoardSection.ISummary,
    created_at: superAdmin.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: superAdmin.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: null,
    email: props.body.email,
    privilege_level: "super",
    token,
  } satisfies IDiscussionBoardSuperAdmin.IAuthorized;
}
