import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestJoin(props: {
  guest: GuestPayload;
  body: IRedditCommunityGuest.ICreate;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  const { body } = props;

  // Generate new UUID for guest id
  const id = v4() as string & tags.Format<"uuid">;

  // Generate timestamps for create and update
  const now = toISOStringSafe(new Date());

  // Prepare user_agent for insertion - explicitly null if not provided
  const user_agent = body.user_agent === undefined ? null : body.user_agent;

  // Create new guest record
  let created;
  try {
    created = await MyGlobal.prisma.reddit_community_guests.create({
      data: {
        id,
        session_id: body.session_id,
        ip_address: body.ip_address,
        user_agent,
        created_at: now,
        updated_at: now,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Conflict: Duplicate session_id", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }

  // Generate JWT tokens with payload
  const accessTokenExpireSeconds = 60 * 60;
  const refreshTokenExpireSeconds = 60 * 60 * 24 * 7;

  const accessToken = jwt.sign(
    {
      id: created.id,
      type: "guest",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessTokenExpireSeconds,
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: created.id,
      type: "guest",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshTokenExpireSeconds,
      issuer: "autobe",
    },
  );

  // Prepare expiration timestamps
  // Use Date only within local scope for conversion
  const nowDateVal = Date.now();
  const expiredAt = toISOStringSafe(
    new Date(nowDateVal + accessTokenExpireSeconds * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(nowDateVal + refreshTokenExpireSeconds * 1000),
  );

  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  } satisfies IAuthorizationToken;

  return {
    id: created.id,
    session_id: created.session_id,
    ip_address: created.ip_address,
    user_agent:
      created.user_agent === null ? null : (created.user_agent ?? null),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    token,
  };
}
