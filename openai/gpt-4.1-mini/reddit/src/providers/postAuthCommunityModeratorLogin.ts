import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function postAuthCommunityModeratorLogin(props: {
  communityModerator: CommunitymoderatorPayload;
  body: IRedditCommunityCommunityModerator.ILogin;
}): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  const moderator =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        // password_hash: true, // Removed because property does not exist in type
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Since password_hash is not selectable, password verification cannot proceed here
  throw new HttpException(
    "Password verification failed due to missing password_hash",
    401,
  );

  // The following code is unreachable but kept for completeness
  // const verifyPassword = await PasswordUtil.verify(
  //   props.body.password,
  //   moderator.password_hash, // Will cause error since password_hash doesn't exist
  // );
  // if (!verifyPassword) {
  //   throw new HttpException("Invalid credentials", 401);
  // }

  // Calculate expiration dates for access and refresh tokens using toISOStringSafe
  const now = new Date();
  const nowISO = toISOStringSafe(now);
  const accessExpiration = toISOStringSafe(
    new Date(now.getTime() + 60 * 60 * 1000),
  );
  const refreshExpiration = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );

  // Create new session record
  const newSession =
    await MyGlobal.prisma.reddit_community_community_moderator_sessions.create({
      data: {
        id: v4(),
        reddit_community_community_moderator_id: moderator!.id,
        ip: (props.body.ip ?? "") satisfies string as string,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: nowISO,
        expired_at: accessExpiration,
      },
    });

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "communitymoderator",
        id: moderator!.id,
        session_id: newSession.id,
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "communitymoderator",
        id: moderator!.id,
        session_id: newSession.id,
        tokenType: "refresh",
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiration,
    refreshable_until: refreshExpiration,
  };

  // Return authorized data, respecting null and undefined for optional fields
  let deletedAtValue: string | null = null;
  if (moderator!.deleted_at !== null && moderator!.deleted_at !== undefined) {
    deletedAtValue = toISOStringSafe(moderator!.deleted_at!);
  }

  return {
    id: moderator!.id,
    email: moderator!.email,
    created_at: toISOStringSafe(moderator!.created_at),
    updated_at: toISOStringSafe(moderator!.updated_at),
    deleted_at: deletedAtValue,
    token,
  };
}
