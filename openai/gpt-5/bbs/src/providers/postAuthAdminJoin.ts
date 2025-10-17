import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminJoin(props: {
  body: IEconDiscussAdmin.ICreate;
}): Promise<IEconDiscussAdmin.IAuthorized> {
  try {
    const { body } = props;

    // Normalize email per schema comments
    const email = body.email.toLowerCase();

    // Enforce uniqueness (pre-check) and also handle race by catching P2002
    const existing = await MyGlobal.prisma.econ_discuss_users.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new HttpException("Conflict: Email already exists", 409);
    }

    // Prepare secure password hash and timestamps
    const password_hash = await PasswordUtil.hash(body.password);
    const now = toISOStringSafe(new Date());

    // Transaction: create user and admin role assignment atomically
    const [createdUser] = await MyGlobal.prisma.$transaction(async (tx) => {
      const user = await tx.econ_discuss_users.create({
        data: {
          id: v4(),
          email,
          password_hash,
          display_name: body.display_name,
          avatar_uri: body.avatar_uri ?? null,
          timezone: body.timezone ?? null,
          locale: body.locale ?? null,
          email_verified: false,
          mfa_enabled: false,
          mfa_secret: null,
          mfa_recovery_codes: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        select: {
          id: true,
          display_name: true,
          avatar_uri: true,
          timezone: true,
          locale: true,
          email_verified: true,
          mfa_enabled: true,
        },
      });

      await tx.econ_discuss_admins.create({
        data: {
          id: v4(),
          user_id: user.id,
          superuser: false,
          enforced_2fa: false,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        select: { id: true },
      });

      return [user];
    });

    // Token issuance
    const accessToken = jwt.sign(
      {
        id: createdUser.id,
        type: "admin",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    );

    const refreshToken = jwt.sign(
      {
        id: createdUser.id,
        type: "admin",
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    const accessExpiredAt = toISOStringSafe(
      new Date(Date.now() + 60 * 60 * 1000),
    );
    const refreshableUntil = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    const result: IEconDiscussAdmin.IAuthorized = {
      id: createdUser.id as string & tags.Format<"uuid">,
      role: "admin",
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: accessExpiredAt,
        refreshable_until: refreshableUntil,
      },
      admin: {
        id: createdUser.id as string & tags.Format<"uuid">,
        displayName: createdUser.display_name,
        avatarUri: createdUser.avatar_uri ?? null,
        timezone: createdUser.timezone ?? null,
        locale: createdUser.locale ?? null,
        emailVerified: createdUser.email_verified,
        mfaEnabled: createdUser.mfa_enabled,
        createdAt: now,
        updatedAt: now,
      },
    };

    return result;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        // Unique constraint violation (email)
        throw new HttpException("Conflict: Email already exists", 409);
      }
    }
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
