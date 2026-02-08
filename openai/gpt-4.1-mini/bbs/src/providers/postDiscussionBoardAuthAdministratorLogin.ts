import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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

export async function postDiscussionBoardAuthAdministratorLogin(props: {
  body: IDiscussionBoardAdministrator.ILogin;
}): Promise<IDiscussionBoardAdministrator.IAuthorized> {
  // 1. There is no email and password in ILogin type as per schema, so for login logic we'll consider empty login or error.
  //    Since schema shows ILogin as empty, login operation cannot proceed normally without credentials.
  //    But according to specification, login with credentials is expected, so we assume this is a protocol placeholder.
  //    For implementation, login with empty fields would fail findFirst anyway, so proceed with that.
  // For demonstration, assume email and password are passed as empty strings.
  const email = "";
  const password = "";
  // 2. Find administrator
  const admin = await MyGlobal.prisma.discussion_board_administrators.findFirst(
    {
      where: { email },
      select: {
        id: true,
        grade_id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (!admin) throw new HttpException("Invalid credentials", 401);
  // 3. Check password
  const isValid = await PasswordUtil.verify(password, admin.password_hash);
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 4. Prepare timestamps
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 3600000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // 5. Create session
  const sessionId: string & tags.Format<"uuid"> = v4();
  const session =
    await MyGlobal.prisma.discussion_board_administrator_sessions.create({
      data: {
        id: sessionId,
        administrator_id: admin.id,
        ip: "",
        href: "",
        referrer: "",
        created_at: now,
        expired_at: accessExpires,
        deleted_at: null,
      },
    });
  // 6. Generate tokens
  const token = {
    access: jwt.sign(
      {
        type: "administrator",
        id: admin.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 7. Return authorized
  return {
    token,
  };
}
