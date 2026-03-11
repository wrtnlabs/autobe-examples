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
import { DiscussionBoardSuperAdminTransformer } from "../transformers/DiscussionBoardSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthSuperAdminJoin(props: {
  ip: string;
  body: IDiscussionBoardSuperAdmin.IJoin;
}): Promise<IDiscussionBoardSuperAdmin.IAuthorized> {
  // 1. Check for duplicate email
  const existing =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: { email: props.body.email },
    });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Create super admin record
  const superAdminId = v4() as string & tags.Format<"uuid">;
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = new Date().toISOString();
  const superAdmin = await MyGlobal.prisma.discussion_board_super_admins.create(
    {
      data: {
        id: superAdminId,
        email: props.body.email,
        password_hash: passwordHash,
        admin_grade: "super",
        created_at: new Date(now),
        updated_at: new Date(now),
        deleted_at: null,
      },
      ...DiscussionBoardSuperAdminTransformer.select(),
    },
  );
  // 3. Create session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.discussion_board_super_admin_sessions.create({
    data: {
      id: sessionId,
      superAdmin: { connect: { id: superAdminId } },
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: new Date(now),
      expired_at: accessExpires,
    },
  });
  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "superAdmin",
        id: superAdminId,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superAdmin",
        id: superAdminId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 5. Return IAuthorized response
  return {
    ...(await DiscussionBoardSuperAdminTransformer.transform(superAdmin)),
    token,
  } satisfies IDiscussionBoardSuperAdmin.IAuthorized;
}
