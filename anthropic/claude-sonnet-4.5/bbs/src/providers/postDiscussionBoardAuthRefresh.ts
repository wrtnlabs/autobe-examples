import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuth";

export async function postDiscussionBoardAuthRefresh(props: {
  body: IDiscussionBoardAuth.IRefresh;
}): Promise<IDiscussionBoardAuth.ITokens> {
  const { body } = props;

  // Decode the refresh token to extract user information
  let decoded: {
    user_id: string;
    user_type: "member" | "moderator";
    session_id: string;
  };

  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY) as {
      user_id: string;
      user_type: "member" | "moderator";
      session_id: string;
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const currentTime = new Date();

  // Validate session based on user type
  if (decoded.user_type === "member") {
    // Query member session
    const session =
      await MyGlobal.prisma.discussion_board_member_sessions.findUnique({
        where: { id: decoded.session_id },
        include: { member: true },
      });

    if (!session) {
      throw new HttpException("Session not found", 401);
    }

    // Check if session has expired (expired_at is set and is in the past)
    if (
      session.expired_at !== null &&
      new Date(session.expired_at) <= currentTime
    ) {
      throw new HttpException("Session has expired", 401);
    }

    // Verify member account is active
    if (session.member.status !== "active") {
      throw new HttpException("User account is not active", 403);
    }

    // Generate new tokens
    const accessToken = jwt.sign(
      {
        user_id: session.member.id,
        user_type: "member",
        username: session.member.username,
        email: session.member.email,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m" },
    );

    const refreshToken = jwt.sign(
      {
        user_id: session.member.id,
        user_type: "member",
        session_id: session.id,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d" },
    );

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 1800,
      refresh_token: refreshToken,
    };
  } else {
    // Query moderator session
    const session =
      await MyGlobal.prisma.discussion_board_moderator_sessions.findUnique({
        where: { id: decoded.session_id },
        include: { moderator: true },
      });

    if (!session) {
      throw new HttpException("Session not found", 401);
    }

    // Check if session has expired (expired_at is set and is in the past)
    if (
      session.expired_at !== null &&
      new Date(session.expired_at) <= currentTime
    ) {
      throw new HttpException("Session has expired", 401);
    }

    // Verify moderator account is active
    if (session.moderator.status !== "active") {
      throw new HttpException("User account is not active", 403);
    }

    // Generate new tokens
    const accessToken = jwt.sign(
      {
        user_id: session.moderator.id,
        user_type: "moderator",
        username: session.moderator.username,
        email: session.moderator.email,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m" },
    );

    const refreshToken = jwt.sign(
      {
        user_id: session.moderator.id,
        user_type: "moderator",
        session_id: session.id,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d" },
    );

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 1800,
      refresh_token: refreshToken,
    };
  }
}
