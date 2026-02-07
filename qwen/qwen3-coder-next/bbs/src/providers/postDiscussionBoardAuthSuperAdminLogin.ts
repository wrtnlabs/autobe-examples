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

export async function postDiscussionBoardAuthSuperAdminLogin(props: {
  body: IDiscussionBoardSuperAdmin.ILogin;
}): Promise<IDiscussionBoardSuperAdmin.IAuthorized> {
  // 1. Find super admin with password_hash explicitly selected
  const admin = await MyGlobal.prisma.discussion_board_super_admins.findFirst({
    where: { email: (props.body as any).email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      display_name: true,
      bio: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!admin) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    (props.body as any).password,
    admin.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Check account is not banned or deleted
  const adminWithDeletedAt = admin as any as {
    deleted_at: Date | null;
  };
  if (adminWithDeletedAt.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 401);
  }
  // 4. Create NEW session record
  const accessExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  const refreshExpires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const session =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_super_admin_id: admin.id as string &
          tags.Format<"uuid">,
        token: v4() as string & tags.Format<"uuid">,
        expires_at: toISOStringSafe(new Date(accessExpires)),
        ip: (props.body as any).ip ?? "",
        user_agent: (props.body as any).user_agent ?? null,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  // 5. Generate JWT tokens
  const tokenPayload = {
    type: "superAdmin",
    id: admin.id,
    session_id: session.id,
    created_at: toISOStringSafe(new Date()),
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Return IAuthorized with token
  return {
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(accessExpires)),
      refreshable_until: toISOStringSafe(new Date(refreshExpires)),
    },
  } satisfies IDiscussionBoardSuperAdmin.IAuthorized;
}
