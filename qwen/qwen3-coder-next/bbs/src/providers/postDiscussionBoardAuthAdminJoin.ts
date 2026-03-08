import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

export async function postDiscussionBoardAuthAdminJoin(props: {
  body: IDiscussionBoardAdmin.IJoin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  const existing = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  const password_hash = await PasswordUtil.hash(props.body.password);
  const adminCreatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const adminUpdatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const admin = await MyGlobal.prisma.discussion_board_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash,
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      is_banned: false,
      role: "admin",
      created_at: adminCreatedAt,
      updated_at: adminUpdatedAt,
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
      role: true,
    },
  });
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const access_token = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: v4(),
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refresh_token = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: v4(),
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  const sessionCreatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const sessionUpdatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const sessionExpiredAt: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpires);
  await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: v4(),
      discussion_board_admin_id: admin.id,
      ip: "127.0.0.1",
      href: "/discussionBoard/auth/admin/join",
      referrer: null,
      access_token,
      refresh_token,
      created_at: sessionCreatedAt,
      updated_at: sessionUpdatedAt,
      expired_at: sessionExpiredAt,
    },
  });
  const token = {
    access: access_token,
    refresh: refresh_token,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } satisfies IAuthorizationToken;
  return {
    id: admin.id as string & tags.Format<"uuid">,
    token,
  } satisfies IDiscussionBoardAdmin.IAuthorized;
}
