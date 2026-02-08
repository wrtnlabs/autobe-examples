import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
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

export async function postDiscussionBoardAuthSuperAdministratorLogin(props: {
  body: IDiscussionBoardSuperAdministrator.ILogin;
}): Promise<IDiscussionBoardSuperAdministrator.IAuthorized> {
  // Find the first super administrator record with password_hash
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_administrators.findFirst({
      select: {
        id: true,
        password_hash: true,
      },
    });
  if (!superAdmin) throw new HttpException("Invalid credentials", 401);
  // Since ILogin is empty, no password is passed, so we must throw invalid credential error
  // because no password to verify
  throw new HttpException("Invalid credentials", 401);
  // This fallback code block is unreachable but shows full intended implementation
  /*
    // 1. Verify password if available
    const isValid = await PasswordUtil.verify(
      props.body.password, // no password in ILogin
      superAdmin.password_hash
    );
    if (!isValid) throw new HttpException("Invalid credentials", 401);

    // 2. Create new session
    const sessionId = v4();
    const nowIso = toISOStringSafe(new Date());
    const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await MyGlobal.prisma.discussion_board_super_administrator_sessions.create({
      data: {
        id: sessionId,
        discussion_board_super_administrator_id: superAdmin.id,
        ip: null,
        href: null,
        referrer: null,
        created_at: nowIso,
        expired_at: toISOStringSafe(accessExpires),
      },
    });

    // 3. Generate tokens
    const token = {
      access: jwt.sign(
        {
          type: "superadministrator",
          id: superAdmin.id,
          session_id: session.id,
          created_at: nowIso,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" }
      ),
      refresh: jwt.sign(
        {
          type: "superadministrator",
          id: superAdmin.id,
          session_id: session.id,
          tokenType: "refresh",
          created_at: nowIso,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" }
      ),
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    };

    // 4. Return authorized
    return {
      token,
    };
    */
}
