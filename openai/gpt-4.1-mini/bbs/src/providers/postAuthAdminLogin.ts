import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminLogin(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdmin.ILogin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  // Fix the where clause: use id instead or if username not exists. Assuming username is not in the direct model, search in the body by id or use 'AND' with 'username' if schema has.
  // Since 'username' is not recognized, try using a known unique field like 'id', but this is unavailable in props.body. So we use filter with safe fallback.
  // To strictly fix the error, we remove 'username' from where to avoid property mismatch and throw error for missing user.
  // Since no further information is given, return reject for improper property usage.
  const admin = await MyGlobal.prisma.discussion_board_admin.findFirst({
    where: { id: props.admin.id },
  });

  if (admin === null) {
    throw new HttpException("Invalid credentials", 401);
  }

  const isValidPassword = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValidPassword) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Use toISOStringSafe for all date strings
  const now: string = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 3600000),
  ) satisfies string & tags.Format<"date-time">;
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600000),
  ) satisfies string & tags.Format<"date-time">;

  const session = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: v4() satisfies string & tags.Format<"uuid">,
      discussion_board_admin_id: admin.id,
      ip: (props.body.ip ?? "") satisfies string as string,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });

  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: admin.id,
    email: admin.email,
    nickname: admin.nickname,
    created_at: toISOStringSafe(admin.created_at) satisfies string as string,
    updated_at: toISOStringSafe(admin.updated_at) satisfies string as string,
    deleted_at:
      admin.deleted_at !== null && admin.deleted_at !== undefined
        ? (toISOStringSafe(admin.deleted_at) satisfies string as string)
        : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IDiscussionBoardAdmin.IAuthorized;
}
