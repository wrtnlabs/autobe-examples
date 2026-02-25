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

export async function postDiscussionBoardAuthSuperAdministratorJoin(props: {
  body: IDiscussionBoardSuperAdministrator.IJoin;
}): Promise<IDiscussionBoardSuperAdministrator.IAuthorized> {
  const existing =
    await MyGlobal.prisma.discussion_board_super_administrators.findFirst({
      where: { email: props.body.email },
    });
  if (existing) throw new HttpException("Email already registered", 409);
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_administrators.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        email: props.body.email,
        password_hash: await PasswordUtil.hash(props.body.password),
        display_name: props.body.email.split("@")[0],
        bio: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  const accessExpiredAt = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpiredAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const session =
    await MyGlobal.prisma.discussion_board_super_administrator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        super_administrator_id: superAdmin.id,
        expired_at: accessExpiredAt,
        ip: props.body.ip ?? "",
        created_at: now,
        deleted_at: null,
        href: props.body.href,
        referrer: props.body.referrer,
      },
    });
  const issuedAt = now;
  const token = {
    access: jwt.sign(
      {
        type: "superadministrator",
        id: superAdmin.id,
        session_id: session.id,
        created_at: issuedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superadministrator",
        id: superAdmin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: issuedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    displayName: superAdmin.display_name,
    bio: superAdmin.bio,
    createdAt: now,
    updatedAt: now,
    deletedAt:
      superAdmin.deleted_at === null
        ? null
        : (superAdmin.deleted_at?.toISOString() as string &
            tags.Format<"date-time">),
    token,
  };
}
