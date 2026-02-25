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
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_administrators.findFirst({
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        display_name: true,
        bio: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: true,
      },
    });
  if (!superAdmin) {
    throw new HttpException("Invalid email or password", 401);
  }
  const verified = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (!verified) {
    throw new HttpException("Invalid email or password", 401);
  }
  const nowStr = toISOStringSafe(new Date());
  const accessExpiresStr = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresStr = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId = v4();
  const session =
    await MyGlobal.prisma.discussion_board_super_administrator_sessions.create({
      data: {
        id: sessionId,
        super_administrator_id: superAdmin.id,
        ip: "",
        href: "",
        referrer: "",
        created_at: nowStr,
        expired_at: accessExpiresStr,
      },
    });
  const token = {
    access: jwt.sign(
      {
        type: "superadministrator",
        id: superAdmin.id,
        session_id: sessionId,
        created_at: nowStr,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "superadministrator",
        id: superAdmin.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowStr,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiresStr,
    refreshable_until: refreshExpiresStr,
  };
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    displayName: superAdmin.display_name,
    bio: superAdmin.bio ?? null,
    createdAt: toISOStringSafe(superAdmin.created_at),
    updatedAt: toISOStringSafe(superAdmin.updated_at),
    deletedAt: superAdmin.deleted_at
      ? toISOStringSafe(superAdmin.deleted_at)
      : null,
    token,
  } as IDiscussionBoardSuperAdministrator.IAuthorized;
}
