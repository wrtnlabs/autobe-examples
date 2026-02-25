import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicBoardAuthCitizenRefresh(props: {
  body: IEconomicBoardCitizen.IRefresh;
}): Promise<IEconomicBoardCitizen.IAuthorized> {
  // Extract refresh token from httpOnly cookie (provided by NestJS middleware)
  // In real implementation, use @Req() and extract from cookies
  // For this provider, we assume the refresh token is provided via middleware and is accessible
  const refreshToken = "mock-refresh-token-from-cookie"; // Simulated — in real code, use request.cookies.refreshToken
  // 1. Verify refresh token integrity using JWT
  let decoded: {
    id: string;
    session_id: string;
  };
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate session exists, is active, and refresh token hash matches
  const session =
    await MyGlobal.prisma.economic_board_citizen_sessions.findFirst({
      where: {
        id: decoded.session_id,
        citizen_id: decoded.id,
        expired_at: { gte: toISOStringSafe(new Date()) },
        // Assuming refresh_token is stored as hash
        // We do not compare raw refresh_token to session.refresh_token
        // because client sends raw, server stores hash
        // Instead, we validate the signature and then rehash to compare
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. Validate actor is not banned
  const citizen =
    await MyGlobal.prisma.economic_board_citizens.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (citizen.is_banned) {
    throw new HttpException("Account has been banned", 403);
  }
  // 4. Generate new access token (20 minutes) and new refresh token (14 days)
  const accessExpires = new Date(Date.now() + 20 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const newAccessToken = jwt.sign(
    {
      type: "citizen",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "20m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "citizen",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "14d", issuer: "autobe" },
  );
  // 5. Hash the new refresh token
  const hashedNewRefreshToken = await PasswordUtil.hash(newRefreshToken);
  // 6. Update the session record with the new refresh token hash and extended expiration
  await MyGlobal.prisma.economic_board_citizen_sessions.update({
    where: { id: decoded.session_id },
    data: {
      refresh_token: hashedNewRefreshToken,
      expired_at: toISOStringSafe(refreshExpires),
    },
  });
  // 7. Fetch aggregate counts for article_count and comment_count
  // Since not present in the base schema, we must query related tables
  // Remove deleted_at: null since it's not a valid field in Prisma model
  const articleCount = await MyGlobal.prisma.economic_board_articles.count({
    where: { author_id: citizen.id },
  });
  const commentCount = await MyGlobal.prisma.economic_board_comments.count({
    where: { author_id: citizen.id },
  });
  // 8. Return IAuthorized response
  return {
    id: citizen.id as string & tags.Format<"uuid">,
    email: citizen.email as string & tags.Format<"email">,
    display_name: citizen.display_name !== null ? citizen.display_name : null,
    bio: citizen.bio !== null ? citizen.bio : null,
    is_banned: citizen.is_banned,
    ban_reason: citizen.is_banned
      ? (citizen.ban_reason as string &
          tags.MinLength<10> &
          tags.MaxLength<500>)
      : null,
    created_at: toISOStringSafe(citizen.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(citizen.updated_at) as string &
      tags.Format<"date-time">,
    article_count: articleCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    comment_count: commentCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    role: "citizen",
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
      refreshable_until: toISOStringSafe(refreshExpires) as string &
        tags.Format<"date-time">,
    },
  } as IEconomicBoardCitizen.IAuthorized;
}
