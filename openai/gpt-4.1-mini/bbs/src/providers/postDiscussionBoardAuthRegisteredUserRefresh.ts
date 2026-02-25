import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function postDiscussionBoardAuthRegisteredUserRefresh(props: {
  body: IDiscussionBoardRegisteredUser.IRefresh;
}): Promise<IDiscussionBoardRegisteredUser.IAuthorized> {
  // 1. Verify refresh token
  const decodedRaw = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
    },
  );
  if (typeof decodedRaw === "string") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate claims existence and types
  if (
    typeof decodedRaw !== "object" ||
    decodedRaw === null ||
    typeof (decodedRaw as any).id !== "string" ||
    typeof (decodedRaw as any).session_id !== "string" ||
    (decodedRaw as any).type !== "registereduser"
  ) {
    throw new HttpException("Invalid token payload", 403);
  }
  const decoded = decodedRaw as {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "registereduser";
  } satisfies {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "registereduser";
  };
  // 2. Validate token type
  if (decoded.type !== "registereduser") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session
  const session =
    await MyGlobal.prisma.discussion_board_registered_user_sessions.findFirst({
      where: {
        id: decoded.session_id,
        registered_user_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate user
  const user =
    await MyGlobal.prisma.discussion_board_registered_users.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (user.is_banned) {
    throw new HttpException("Account is banned", 403);
  }
  // Helper: get current datetime string with format
  const currentDateTime = () => toISOStringSafe(new Date());
  // Calculate expiration dates as string & tags.Format<'date-time'>
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Generate tokens
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: currentDateTime(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: currentDateTime(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session expiration
  await MyGlobal.prisma.discussion_board_registered_user_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // Return the IAuthorized DTO
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    bio: user.bio ?? null,
    isBanned: user.is_banned,
    createdAt: toISOStringSafe(user.created_at),
    updatedAt: toISOStringSafe(user.updated_at),
    deletedAt: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    articles: [],
    comments: [],
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
