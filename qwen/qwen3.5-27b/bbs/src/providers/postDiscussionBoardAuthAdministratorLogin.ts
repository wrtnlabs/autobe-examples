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
import { DiscussionBoardAdministratorTransformer } from "../transformers/DiscussionBoardAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthAdministratorLogin(props: {
  ip: string;
  body: IDiscussionBoardAdministrator.ILogin;
}): Promise<IDiscussionBoardAdministrator.IAuthorized> {
  // 1. Find administrator with password_hash
  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
      select: {
        ...DiscussionBoardAdministratorTransformer.select().select,
        password_hash: true,
      },
    });
  if (!administrator) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    administrator.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create NEW session
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.discussion_board_administrator_sessions.create({
      data: {
        id: v4(),
        discussion_board_administrator_id: administrator.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        access_token_expires_at: accessExpires,
        refresh_token_expires_at: refreshExpires,
        created_at: new Date(),
        expired_at: new Date("9999-12-31T23:59:59.999Z"),
      },
    });
  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  } satisfies IAuthorizationToken;
  // 5. Return IAuthorized
  return {
    ...(await DiscussionBoardAdministratorTransformer.transform(administrator)),
    token,
  } satisfies IDiscussionBoardAdministrator.IAuthorized;
}
