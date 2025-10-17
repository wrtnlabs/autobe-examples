import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCommunityOwnerJoin(props: {
  body: ICommunityPlatformCommunityOwner.ICreate;
}): Promise<ICommunityPlatformCommunityOwner.IAuthorized> {
  const { body } = props;

  // Uniqueness pre-check for email and username
  const existing = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      OR: [{ email: body.email }, { username: body.username }],
    },
    select: { id: true, email: true, username: true },
  });
  if (existing) {
    const message =
      existing.email === body.email
        ? "Conflict: email already exists"
        : existing.username === body.username
          ? "Conflict: username already exists"
          : "Conflict: email or username already exists";
    throw new HttpException(message, 409);
  }

  const now = toISOStringSafe(new Date());
  const accessExpiresMs = 60 * 60 * 1000; // 1 hour
  const refreshExpiresMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Hash password
  const passwordHash = await PasswordUtil.hash(body.password);

  try {
    // Create core user
    const createdUser = await MyGlobal.prisma.community_platform_users.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        email: body.email,
        username: body.username,
        password_hash: passwordHash,
        display_name: body.display_name ?? null,
        avatar_uri: body.avatar_uri ?? null,
        email_verified: false,
        account_state: "PendingVerification",
        terms_accepted_at: toISOStringSafe(body.terms_accepted_at),
        privacy_accepted_at: toISOStringSafe(body.privacy_accepted_at),
        marketing_opt_in: body.marketing_opt_in ?? false,
        marketing_opt_in_at: body.marketing_opt_in_at
          ? toISOStringSafe(body.marketing_opt_in_at)
          : null,
        last_login_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: { id: true },
    });

    // Grant member capabilities immediately (for ownership workflows later)
    await MyGlobal.prisma.community_platform_member_users.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_platform_user_id: createdUser.id as string &
          tags.Format<"uuid">,
        joined_at: now,
        status: "active",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    // Issue JWT tokens
    const accessToken = jwt.sign(
      {
        id: createdUser.id as string & tags.Format<"uuid">,
        type: "communityowner",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );
    const refreshToken = jwt.sign(
      {
        id: createdUser.id as string & tags.Format<"uuid">,
        type: "communityowner",
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );

    const expiredAt = toISOStringSafe(new Date(Date.now() + accessExpiresMs));
    const refreshableUntil = toISOStringSafe(
      new Date(Date.now() + refreshExpiresMs),
    );

    return {
      id: createdUser.id as string & tags.Format<"uuid">,
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: expiredAt,
        refreshable_until: refreshableUntil,
      },
      role: "communityOwner",
    };
  } catch (err) {
    // Handle unique constraint races and propagate others
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Conflict: email or username already exists",
        409,
      );
    }
    throw err;
  }
}
