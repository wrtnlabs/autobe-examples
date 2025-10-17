import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityModeratorJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorJoin";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCommunityModeratorJoin(props: {
  body: ICommunityPlatformCommunityModeratorJoin.ICreate;
}): Promise<ICommunityPlatformCommunityModerator.IAuthorized> {
  const { body } = props;

  // Uniqueness pre-check for clearer conflict response before attempting create
  const existing = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      OR: [{ email: body.email }, { username: body.username }],
    },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("Conflict: Email or username already exists", 409);
  }

  const now = toISOStringSafe(new Date());

  const marketingOptIn: boolean = body.marketing_opt_in ?? false;
  const marketingOptInAt = body.marketing_opt_in_at
    ? toISOStringSafe(body.marketing_opt_in_at)
    : marketingOptIn
      ? now
      : null;

  const hashedPassword = await PasswordUtil.hash(body.password);

  let createdUser: { id: string };
  try {
    createdUser = await MyGlobal.prisma.$transaction(async (tx) => {
      const user = await tx.community_platform_users.create({
        data: {
          id: v4(),
          email: body.email,
          username: body.username,
          password_hash: hashedPassword,
          display_name: null,
          avatar_uri: null,
          email_verified: false,
          account_state: "PendingVerification",
          terms_accepted_at: toISOStringSafe(body.terms_accepted_at),
          privacy_accepted_at: toISOStringSafe(body.privacy_accepted_at),
          marketing_opt_in: marketingOptIn,
          marketing_opt_in_at: marketingOptInAt,
          last_login_at: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        select: { id: true },
      });

      await tx.community_platform_member_users.create({
        data: {
          id: v4(),
          community_platform_user_id: user.id,
          joined_at: now,
          status: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });

      return user;
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Conflict: Email or username already exists",
        409,
      );
    }
    throw new HttpException("Internal Server Error", 500);
  }

  const nowMs = Date.now();
  const accessExpiresAtMs = nowMs + 60 * 60 * 1000; // 1 hour
  const refreshExpiresAtMs = nowMs + 7 * 24 * 60 * 60 * 1000; // 7 days

  const accessToken = jwt.sign(
    { id: createdUser.id, type: "communityModerator" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: createdUser.id, type: "communityModerator", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(new Date(accessExpiresAtMs)),
    refreshable_until: toISOStringSafe(new Date(refreshExpiresAtMs)),
  };

  return {
    id: createdUser.id as string & tags.Format<"uuid">,
    token,
    role: "communityModerator",
  };
}
