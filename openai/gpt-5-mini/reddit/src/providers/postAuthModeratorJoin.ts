import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorJoin(props: {
  body: ICommunityPortalModerator.ICreate;
}): Promise<ICommunityPortalModerator.IAuthorized> {
  const { body } = props;

  // Check uniqueness for username or email
  const existing = await MyGlobal.prisma.community_portal_users.findFirst({
    where: {
      OR: [{ email: body.email }, { username: body.username }],
    },
  });

  if (existing) {
    throw new HttpException("Conflict: username or email already exists", 409);
  }

  // Hash the plaintext password
  const password_hash = await PasswordUtil.hash(body.password);

  // Prepare identifiers and timestamps
  const userId = v4() as string & tags.Format<"uuid">;
  const memberId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  try {
    // Create user and member atomically
    const createdUser = await MyGlobal.prisma.$transaction(async (tx) => {
      const user = await tx.community_portal_users.create({
        data: {
          id: userId,
          username: body.username,
          email: body.email,
          password_hash,
          display_name:
            body.display_name === null ? null : (body.display_name ?? null),
          avatar_uri:
            body.avatar_uri === null ? null : (body.avatar_uri ?? null),
          karma: 0,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });

      await tx.community_portal_members.create({
        data: {
          id: memberId,
          user_id: userId,
          member_since: now,
          is_email_verified: false,
          is_suspended: false,
          created_at: now,
          updated_at: now,
        },
      });

      return user;
    });

    // Token expirations (ISO strings)
    const accessExpiredAt = toISOStringSafe(
      new Date(Date.now() + 60 * 60 * 1000),
    ); // 1 hour
    const refreshableUntil = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ); // 7 days

    // Sign JWTs with ModeratorPayload structure
    const access = jwt.sign(
      { id: createdUser.id, type: "moderator" },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    );

    const refresh = jwt.sign(
      { id: createdUser.id, type: "moderator", tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    // Build response mapping DB nulls to optional undefined where DTO expects optional
    return {
      id: createdUser.id as string & tags.Format<"uuid">,
      username: createdUser.username,
      display_name:
        createdUser.display_name === null
          ? undefined
          : createdUser.display_name,
      karma: createdUser.karma,
      avatar_uri:
        createdUser.avatar_uri === null ? undefined : createdUser.avatar_uri,
      token: {
        access,
        refresh,
        expired_at: accessExpiredAt,
        refreshable_until: refreshableUntil,
      },
    };
  } catch (err) {
    // Re-throw known HttpExceptions
    if (err instanceof HttpException) throw err;
    // Unexpected errors
    throw new HttpException("Internal Server Error", 500);
  }
}
