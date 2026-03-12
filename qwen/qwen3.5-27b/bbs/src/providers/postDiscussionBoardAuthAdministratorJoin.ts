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

export async function postDiscussionBoardAuthAdministratorJoin(props: {
  ip: string;
  body: IDiscussionBoardAdministrator.IJoin;
}): Promise<IDiscussionBoardAdministrator.IAuthorized> {
  // 1. Check duplicate email
  const existing =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: { email: props.body.email },
    });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create administrator
  const createdAt = new Date();
  const admin = await MyGlobal.prisma.discussion_board_administrators.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name,
      bio: props.body.bio,
      grade: "regular",
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
    },
    ...DiscussionBoardAdministratorTransformer.select(),
  });
  // 4. Create session
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.discussion_board_administrator_sessions.create({
    data: {
      id: v4(),
      discussion_board_administrator_id: admin.id,
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      access_token_hash: null,
      refresh_token_hash: null,
      access_token_expires_at: accessExpires,
      refresh_token_expires_at: refreshExpires,
      created_at: createdAt,
      expired_at: new Date("9999-12-31T23:59:59.999Z"),
    },
    ...DiscussionBoardAdministratorTransformer.select(),
  });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "administrator",
        id: admin.id,
        session_id: "placeholder",
        created_at: createdAt.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: admin.id,
        session_id: "placeholder",
        tokenType: "refresh",
        created_at: createdAt.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 6. Return IAuthorized
  return {
    ...(await DiscussionBoardAdministratorTransformer.transform(admin)),
    token,
  } satisfies IDiscussionBoardAdministrator.IAuthorized;
}
