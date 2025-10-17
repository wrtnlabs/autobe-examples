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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminRefresh(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdmin.IRefresh;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  const { body } = props;

  let payload: { id: string & tags.Format<"uuid">; type: string };
  try {
    payload = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string & tags.Format<"uuid">; type: string };
  } catch {
    throw new HttpException(
      "Unauthorized: Invalid or expired refresh token",
      401,
    );
  }

  if (payload.type !== "admin") {
    throw new HttpException("Forbidden: Token type mismatch", 403);
  }

  const adminUser = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { id: payload.id },
  });

  if (!adminUser || adminUser.deleted_at !== null) {
    throw new HttpException(
      "Forbidden: Admin user not found or deactivated",
      403,
    );
  }

  const now = new Date();
  const accessExpiredAt = toISOStringSafe(
    new Date(now.getTime() + 3600 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 3600 * 1000),
  );

  const accessPayload = {
    id: adminUser.id,
    email: adminUser.email,
    displayName: adminUser.display_name,
    type: "admin",
  };

  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refreshPayload = {
    id: adminUser.id,
    tokenType: "refresh",
  };

  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  return {
    id: adminUser.id,
    email: adminUser.email,
    password_hash: adminUser.password_hash,
    display_name: adminUser.display_name,
    created_at: toISOStringSafe(adminUser.created_at),
    updated_at: toISOStringSafe(adminUser.updated_at),
    deleted_at: adminUser.deleted_at
      ? toISOStringSafe(adminUser.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
