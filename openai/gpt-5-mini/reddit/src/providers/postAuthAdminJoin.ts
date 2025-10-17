import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminJoin(props: {
  body: ICommunityPortalAdmin.ICreate;
}): Promise<ICommunityPortalAdmin.IAuthorized> {
  const { body } = props;

  // Check uniqueness of username and email
  const existingByUsername =
    await MyGlobal.prisma.community_portal_users.findUnique({
      where: { username: body.username },
    });
  if (existingByUsername)
    throw new HttpException("Conflict: username already exists", 409);

  const existingByEmail =
    await MyGlobal.prisma.community_portal_users.findUnique({
      where: { email: body.email },
    });
  if (existingByEmail)
    throw new HttpException("Conflict: email already exists", 409);

  // Hash the password
  const passwordHash = await PasswordUtil.hash(body.password);

  // Prepare timestamp strings once
  const now = toISOStringSafe(new Date());
  const accessExpireMs = 60 * 60 * 1000; // 1 hour
  const refreshExpireMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  try {
    // Create user record
    const createdUser = await MyGlobal.prisma.community_portal_users.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        username: body.username,
        email: body.email,
        password_hash: passwordHash,
        display_name: body.displayName ?? null,
        bio: null,
        avatar_uri: null,
        karma: 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    // Create admin metadata record
    const createdAdmin = await MyGlobal.prisma.community_portal_admins.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_id: createdUser.id,
        admin_level: body.adminLevel ?? "super",
        is_active: body.isActive ?? true,
        created_at: now,
        updated_at: now,
      },
    });

    // Issue tokens
    const accessToken = jwt.sign(
      { id: createdUser.id, type: "admin" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );

    const refreshToken = jwt.sign(
      { id: createdUser.id, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );

    const expired_at = toISOStringSafe(new Date(Date.now() + accessExpireMs));
    const refreshable_until = toISOStringSafe(
      new Date(Date.now() + refreshExpireMs),
    );

    return {
      id: createdUser.id as string & tags.Format<"uuid">,
      admin: {
        id: createdAdmin.id as string & tags.Format<"uuid">,
        username: createdUser.username,
        display_name: createdUser.display_name ?? undefined,
        karma: Number(createdUser.karma) as number & tags.Type<"int32">,
        member_since: undefined,
      },
      user: {
        id: createdUser.id as string & tags.Format<"uuid">,
        username: createdUser.username,
        display_name: createdUser.display_name ?? null,
        bio: createdUser.bio ?? null,
        avatar_uri: createdUser.avatar_uri ?? null,
        karma: Number(createdUser.karma) as number & tags.Type<"int32">,
        created_at: now,
        updated_at: now,
      },
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at,
        refreshable_until,
      },
    };
  } catch (error) {
    // Prisma unique constraint error
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // If constraint target is available, provide a clearer message
      const meta = (error.meta ?? {}) as Record<string, unknown>;
      const target = Array.isArray(meta.target)
        ? String(meta.target[0])
        : String(meta.target ?? "");
      if (target.includes("username"))
        throw new HttpException("Conflict: username already exists", 409);
      if (target.includes("email"))
        throw new HttpException("Conflict: email already exists", 409);
      throw new HttpException("Conflict: duplicate record", 409);
    }

    throw new HttpException("Internal Server Error", 500);
  }
}
