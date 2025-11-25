import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

export async function postAuthGuestUserJoin(props: {
  guestUser: GuestuserPayload;
  body: IDiscussionBoardGuestUser.IJoin;
}): Promise<IDiscussionBoardGuestUser.IAuthorized> {
  const anonymousToken = props.body.anonymous_token;

  const nowDate = new Date();
  const now = toISOStringSafe(nowDate);

  const accessExpiresDate = new Date(nowDate.getTime() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(
    nowDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  const accessExpiresAt = toISOStringSafe(accessExpiresDate);
  const refreshExpiresAt = toISOStringSafe(refreshExpiresDate);

  const findActiveOrAnyGuest = async () => {
    return MyGlobal.prisma.discussion_board_guestusers.findUnique({
      where: { anonymous_token: anonymousToken },
    });
  };

  let guest = await findActiveOrAnyGuest();

  if (!guest) {
    try {
      guest = await MyGlobal.prisma.discussion_board_guestusers.create({
        data: {
          id: v4(),
          anonymous_token: anonymousToken,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        guest = await findActiveOrAnyGuest();
      } else {
        throw error;
      }
    }
  }

  if (!guest) {
    throw new HttpException("Failed to materialize guest user", 500);
  }

  if (guest.deleted_at !== null) {
    guest = await MyGlobal.prisma.discussion_board_guestusers.update({
      where: { id: guest.id },
      data: {
        deleted_at: null,
        updated_at: now,
      },
    });
  } else {
    guest = await MyGlobal.prisma.discussion_board_guestusers.update({
      where: { id: guest.id },
      data: {
        updated_at: now,
      },
    });
  }

  // For guests, we don't have a dedicated session table in Prisma. We still
  // need a session identifier in the JWT payload, so generate an ephemeral
  // UUID to represent this logical session instance.
  const sessionId = v4();

  const accessToken = jwt.sign(
    {
      type: "guestUser",
      id: guest.id,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "guestUser",
      id: guest.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };

  const response: IDiscussionBoardGuestUser.IAuthorized = {
    id: guest.id,
    anonymous_token: guest.anonymous_token,
    created_at: guest.created_at ? toISOStringSafe(guest.created_at) : now,
    updated_at: guest.updated_at ? toISOStringSafe(guest.updated_at) : now,
    deleted_at:
      guest.deleted_at !== null && guest.deleted_at !== undefined
        ? toISOStringSafe(guest.deleted_at)
        : null,
    token,
  };

  return response;
}
