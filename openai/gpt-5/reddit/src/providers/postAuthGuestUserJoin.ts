import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestUserJoin(props: {
  body: ICommunityPlatformGuestUser.IJoin;
}): Promise<ICommunityPlatformGuestUser.IAuthorized> {
  const { body } = props;

  // Duplicate prevention (email or username)
  const duplicate = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      deleted_at: null,
      OR: [{ email: body.email }, { username: body.username }],
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new HttpException(
      "Conflict: Email or username already registered",
      409,
    );
  }

  // Timestamps
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const termsAccepted: string & tags.Format<"date-time"> = toISOStringSafe(
    body.terms_accepted_at,
  );
  const privacyAccepted: string & tags.Format<"date-time"> = toISOStringSafe(
    body.privacy_accepted_at,
  );

  // Hash a random secret to satisfy non-null password_hash (guests have no credentials)
  const randomSecret = v4();
  const passwordHash = await PasswordUtil.hash(randomSecret);

  // Prepare expirations
  const accessExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  try {
    // Create user and role in a transaction
    const createdUser = await MyGlobal.prisma.$transaction(async (tx) => {
      const user = await tx.community_platform_users.create({
        data: {
          id: v4(),
          email: body.email,
          username: body.username,
          password_hash: passwordHash,
          email_verified: false,
          account_state: "PendingVerification",
          terms_accepted_at: termsAccepted,
          privacy_accepted_at: privacyAccepted,
          marketing_opt_in: body.marketing_opt_in ?? false,
          marketing_opt_in_at: body.marketing_opt_in ? now : null,
          last_login_at: now,
          created_at: now,
          updated_at: now,
        },
        select: {
          id: true,
          email: true,
        },
      });

      await tx.community_platform_guest_users.create({
        data: {
          id: v4(),
          community_platform_user_id: user.id,
          granted_at: now,
          revoked_at: null,
          created_at: now,
          updated_at: now,
        },
      });

      return user;
    });

    // JWT tokens
    const accessToken = jwt.sign(
      {
        id: createdUser.id,
        type: "guestuser",
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
        type: "guestuser",
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    return {
      id: createdUser.id as string & tags.Format<"uuid">,
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: accessExpiresAt,
        refreshable_until: refreshExpiresAt,
      },
      role: "guestUser",
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Conflict: Email or username already registered",
        409,
      );
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
