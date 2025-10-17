import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: IDiscussionBoardAdmin.IRefresh;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  const { body } = props;
  let payload: any;
  try {
    payload = jwt.verify(body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Expect admin payload: id and type 'admin'
  if (
    !payload ||
    typeof payload !== "object" ||
    payload.type !== "admin" ||
    typeof payload.id !== "string"
  ) {
    throw new HttpException("Invalid refresh token payload.", 401);
  }
  const adminId = payload.id;

  const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      id: adminId,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Admin account not found or disabled.", 404);
  }

  // Audit: Update 'updated_at' timestamp
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_admins.update({
    where: { id: admin.id },
    data: { updated_at: now },
  });

  // 30 min access, 30 day refresh (in sec)
  const accessExpiresIn = 30 * 60; // 30min
  const refreshExpiresIn = 30 * 24 * 60 * 60; // 30d
  const accessExp = Math.floor(Date.now() / 1000) + accessExpiresIn;
  const refreshExp = Math.floor(Date.now() / 1000) + refreshExpiresIn;

  // new access token
  const accessToken = jwt.sign(
    {
      id: admin.id,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessExpiresIn,
      issuer: "autobe",
    },
  );

  // new refresh token
  const refreshToken = jwt.sign(
    {
      id: admin.id,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshExpiresIn,
      issuer: "autobe",
    },
  );

  const expiredAt = toISOStringSafe(
    new Date(Date.now() + accessExpiresIn * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + refreshExpiresIn * 1000),
  );

  return {
    id: admin.id,
    email: admin.email,
    username: admin.username,
    email_verified: admin.email_verified,
    registration_completed_at: toISOStringSafe(admin.registration_completed_at),
    created_at: toISOStringSafe(admin.created_at),
    updated_at: now,
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
