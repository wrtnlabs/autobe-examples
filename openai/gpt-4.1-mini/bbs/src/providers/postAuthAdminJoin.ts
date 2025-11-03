import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdmin.IJoin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  const existingAdmin = await MyGlobal.prisma.discussion_board_admins.findFirst(
    {
      where: { email: props.body.email },
    },
  );

  if (existingAdmin !== null) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const now = toISOStringSafe(new Date());
  const adminId = v4();
  const sessionId = v4();

  const admin = await MyGlobal.prisma.discussion_board_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
    },
  });

  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: sessionId,
      discussion_board_admin_id: adminId,
      ip: "",
      href: "",
      referrer: "",
      created_at: now,
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: now,
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
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: admin.id,
    email: admin.email,
    password_hash: admin.password_hash,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    token,
  };
}
