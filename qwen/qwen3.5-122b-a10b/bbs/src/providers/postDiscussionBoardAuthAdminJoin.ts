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
import { DiscussionBoardAdminTransformer } from "../transformers/DiscussionBoardAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthAdminJoin(props: {
  body: IDiscussionBoardAdmin.IJoin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  // 1. Check email uniqueness
  const existingByEmail =
    await MyGlobal.prisma.discussion_board_admins.findFirst({
      where: { email: props.body.email, deleted_at: null },
    });
  if (existingByEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Check display_name uniqueness
  const existingByDisplayName =
    await MyGlobal.prisma.discussion_board_admins.findFirst({
      where: { display_name: props.body.display_name, deleted_at: null },
    });
  if (existingByDisplayName) {
    throw new HttpException("Display name already exists", 409);
  }
  // 3. Create admin record (manual - password hashing handled by PasswordUtil)
  const adminId = v4();
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = new Date();
  const nowIso = toISOStringSafe(now);
  const admin = await MyGlobal.prisma.discussion_board_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      grade: "regular",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    } satisfies Prisma.discussion_board_adminsCreateInput,
    ...DiscussionBoardAdminTransformer.select(),
  });
  // 4. Create session record
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: sessionId,
      discussionBoardAdmin: { connect: { id: admin.id } },
      ip: props.body.ip ?? "127.0.0.1",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    } satisfies Prisma.discussion_board_admin_sessionsCreateInput,
  });
  // 5. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 6. Return IAuthorized
  const adminData = await DiscussionBoardAdminTransformer.transform(admin);
  const result = {
    ...adminData,
    grade: typia.assert<"regular" | "super">(adminData.grade),
    token,
  };
  return result satisfies IDiscussionBoardAdmin.IAuthorized;
}
