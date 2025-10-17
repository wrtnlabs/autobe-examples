import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminUserJoin(props: {
  body: ICommunityPlatformAdminUserJoin.ICreate;
}): Promise<ICommunityPlatformAdminUser.IAuthorized> {
  const { body } = props;

  const existing = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      OR: [{ email: body.email }, { username: body.username }],
    },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("Conflict: email or username already exists", 409);
  }

  const now = toISOStringSafe(new Date());

  const passwordHash = await PasswordUtil.hash(body.password);
  const userId = v4() as string & tags.Format<"uuid">;
  const adminGrantId = v4() as string & tags.Format<"uuid">;

  const optedIn = body.marketing_opt_in ?? false;
  const marketingOptInAt = optedIn
    ? body.marketing_opt_in_at
      ? toISOStringSafe(body.marketing_opt_in_at)
      : now
    : null;

  try {
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.community_platform_users.create({
        data: {
          id: userId,
          email: body.email,
          username: body.username,
          password_hash: passwordHash,
          email_verified: false,
          account_state: "PendingVerification",
          terms_accepted_at: toISOStringSafe(body.terms_accepted_at),
          privacy_accepted_at: toISOStringSafe(body.privacy_accepted_at),
          marketing_opt_in: optedIn,
          marketing_opt_in_at: marketingOptInAt,
          last_login_at: now,
          created_at: now,
          updated_at: now,
        },
        select: { id: true },
      });

      await tx.community_platform_admin_users.create({
        data: {
          id: adminGrantId,
          community_platform_user_id: userId,
          granted_at: now,
          revoked_at: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        select: { id: true },
      });
    });
  } catch (err) {
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

  const accessToken = jwt.sign(
    { id: userId, type: "adminuser" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: userId, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const expiredAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  } satisfies IAuthorizationToken;

  return {
    id: userId as string & tags.Format<"uuid">,
    token,
    role: "adminUser",
  };
}
