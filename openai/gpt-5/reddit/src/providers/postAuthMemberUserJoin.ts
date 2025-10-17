import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberUserJoin(props: {
  body: ICommunityPlatformMemberUser.ICreate;
}): Promise<ICommunityPlatformMemberUser.IAuthorized> {
  const { body } = props;

  const duplicate = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      OR: [{ email: body.email }, { username: body.username }],
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new HttpException("Conflict: Email or username already exists", 409);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const marketingOptIn: boolean = body.marketing_opt_in ?? false;
  const marketingOptInAt: (string & tags.Format<"date-time">) | null =
    marketingOptIn ? now : null;

  const passwordHash = await PasswordUtil.hash(body.password);

  try {
    const createdUser = await MyGlobal.prisma.$transaction(async (tx) => {
      const user = await tx.community_platform_users.create({
        data: {
          id: v4(),
          email: body.email,
          username: body.username,
          password_hash: passwordHash,
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

    const accessToken = jwt.sign(
      {
        id: createdUser.id,
        type: "memberuser",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );

    const refreshToken = jwt.sign(
      {
        id: createdUser.id,
        type: "memberuser",
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );

    const accessExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
      new Date(Date.now() + 60 * 60 * 1000),
    );
    const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    return {
      id: createdUser.id as string & tags.Format<"uuid">,
      username: createdUser.username ?? undefined,
      display_name:
        createdUser.display_name === null
          ? undefined
          : createdUser.display_name,
      avatar_uri:
        createdUser.avatar_uri === null ? undefined : createdUser.avatar_uri,
      email_verified: createdUser.email_verified,
      account_state: createdUser.account_state,
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: accessExpiredAt,
        refreshable_until: refreshableUntil,
      },
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        throw new HttpException(
          "Conflict: Email or username already exists",
          409,
        );
      }
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
