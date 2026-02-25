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

export async function postDiscussionBoardAuthSuperAdministratorRefresh(props: {
  body: IDiscussionBoardSuperAdministrator.IRefresh;
}): Promise<IDiscussionBoardSuperAdministrator.IAuthorized> {
  // Helper functions to return ISO formatted date-time strings
  function isoDateTime(): string & tags.Format<"date-time"> {
    return toISOStringSafe(new Date());
  }
  function isoDateTimeAfter(
    milliseconds: number,
  ): string & tags.Format<"date-time"> {
    return toISOStringSafe(new Date(Date.now() + milliseconds));
  }
  // Decode and verify JWT refresh token
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "superadministrator";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as any;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate the actor type
  if (decoded.type !== "superadministrator") {
    throw new HttpException("Invalid token type", 403);
  }
  // Validate session existence
  const session =
    await MyGlobal.prisma.discussion_board_super_administrator_sessions.findFirst(
      {
        where: {
          id: decoded.session_id,
          super_administrator_id: decoded.id,
        },
      },
    );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Load super administrator record
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_administrators.findUniqueOrThrow(
      {
        where: { id: decoded.id },
      },
    );
  // Check if account is deleted
  if (superAdmin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Calculate expiration timestamps
  const accessExpires = isoDateTimeAfter(60 * 60 * 1000); // 1 hour
  const refreshExpires = isoDateTimeAfter(7 * 24 * 60 * 60 * 1000); // 7 days
  // Create new JWT access token
  const accessToken = jwt.sign(
    {
      type: "superadministrator",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: isoDateTime(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  // Create new JWT refresh token
  const refreshToken = jwt.sign(
    {
      type: "superadministrator",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: isoDateTime(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session expiration timestamp
  await MyGlobal.prisma.discussion_board_super_administrator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // Return authorized user data with tokens
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    displayName: superAdmin.display_name,
    bio: superAdmin.bio,
    createdAt: toISOStringSafe(superAdmin.created_at),
    updatedAt: toISOStringSafe(superAdmin.updated_at),
    deletedAt:
      superAdmin.deleted_at === null
        ? null
        : toISOStringSafe(superAdmin.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
