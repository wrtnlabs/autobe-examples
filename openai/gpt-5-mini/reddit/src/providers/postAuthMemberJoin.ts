import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberJoin(props: {
  body: ICommunityPortalMember.ICreate;
}): Promise<ICommunityPortalMember.IAuthorized> {
  const { body } = props;

  // Uniqueness check (username or email)
  const existing = await MyGlobal.prisma.community_portal_users.findFirst({
    where: {
      OR: [{ username: body.username }, { email: body.email }],
    },
  });

  if (existing) {
    if (existing.username === body.username) {
      throw new HttpException("Username already in use", 409);
    }
    if (existing.email === body.email) {
      throw new HttpException("Email already in use", 409);
    }
    throw new HttpException("Username or email already in use", 409);
  }

  // Business operation: hash password and create records atomically
  const passwordHash = await PasswordUtil.hash(body.password);

  const userId = v4() as string & tags.Format<"uuid">;
  const memberId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  try {
    const { createdUser } = await MyGlobal.prisma.$transaction(
      async (prisma) => {
        const createdUser = await prisma.community_portal_users.create({
          data: {
            // strip typia tags when assigning to Prisma fields
            id: userId satisfies string as string,
            username: body.username,
            email: body.email,
            password_hash: passwordHash,
            display_name: body.display_name ?? null,
            karma: 0,
            created_at: now satisfies string as string,
            updated_at: now satisfies string as string,
            deleted_at: null,
          },
        });

        await prisma.community_portal_members.create({
          data: {
            id: memberId satisfies string as string,
            user_id: createdUser.id satisfies string as string,
            member_since: now satisfies string as string,
            is_email_verified: false,
            // Provide required primitive field to satisfy Prisma schema
            is_suspended: false,
            created_at: now satisfies string as string,
            updated_at: now satisfies string as string,
          },
        });

        return { createdUser };
      },
    );

    // JWT issuance
    const access = jwt.sign(
      { id: userId satisfies string as string, type: "member" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );

    const refresh = jwt.sign(
      { id: userId satisfies string as string, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );

    const expiredAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
    const refreshableUntil = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    return {
      id: userId,
      username: createdUser.username,
      display_name: createdUser.display_name ?? null,
      karma: createdUser.karma ?? 0,
      created_at: now,
      token: {
        access,
        refresh,
        expired_at: expiredAt,
        refreshable_until: refreshableUntil,
      },
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Unique constraint violation may still occur due to race.
      // Prisma P2002 meta contains target fields but it's not typed here.
      throw new HttpException("Username or email already in use", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
