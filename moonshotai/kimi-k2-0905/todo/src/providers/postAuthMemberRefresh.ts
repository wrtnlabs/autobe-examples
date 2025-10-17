import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITokenRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITokenRefresh";
import { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberRefresh(props: {
  body: ITokenRefresh.IRequest;
}): Promise<ITodoMember.IAuthorized> {
  try {
    // Step 1: Verify and decode the refresh token
    const decoded = jwt.verify(
      props.body.refresh,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    ) as any;

    // Step 2: Find the session by JWT token
    const existingSession = await MyGlobal.prisma.todo_sessions.findUnique({
      where: { jwt_token: props.body.refresh },
    });

    if (!existingSession) {
      throw new HttpException("Invalid refresh token - session not found", 401);
    }

    // Step 3: Check session expiration
    if (new Date(existingSession.expires_at) < new Date()) {
      throw new HttpException("Session expired", 401);
    }

    // Step 4: Find the member associated with the session
    const member = await MyGlobal.prisma.todo_member.findUnique({
      where: { id: existingSession.member_id },
    });

    if (!member) {
      throw new HttpException("Member not found", 404);
    }

    // Step 5: Generate new tokens with same payload structure
    const now = toISOStringSafe(new Date());
    const accessTokenExp = new Date();
    accessTokenExp.setHours(accessTokenExp.getHours() + 1);

    const refreshTokenExp = new Date();
    refreshTokenExp.setDate(refreshTokenExp.getDate() + 7);

    const newAccessToken = jwt.sign(
      {
        userId: member.id,
        email: member.email,
        role: member.role,
        type: "member",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    );

    const newRefreshToken = jwt.sign(
      {
        userId: member.id,
        type: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    // Step 6: Update the session with new JWT token and timestamps
    await MyGlobal.prisma.todo_sessions.update({
      where: { id: existingSession.id },
      data: {
        jwt_token: newRefreshToken,
        expires_at: toISOStringSafe(refreshTokenExp),
        last_used_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

    // Step 7: Return the authorized member response
    return {
      id: member.id as string & tags.Format<"uuid">,
      email: member.email as string & tags.Format<"email">,
      role: member.role as IETodoRole,
      token: {
        access: newAccessToken,
        refresh: newRefreshToken,
        expired_at: toISOStringSafe(accessTokenExp),
        refreshable_until: toISOStringSafe(refreshTokenExp),
      },
      last_login_at: member.last_login_at
        ? toISOStringSafe(member.last_login_at)
        : null,
    };
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    // Handle JWT verification errors
    if (error instanceof jwt.JsonWebTokenError) {
      throw new HttpException("Invalid refresh token", 401);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new HttpException("Refresh token expired", 401);
    }
    // Handle other errors
    throw new HttpException("Token refresh failed", 401);
  }
}
