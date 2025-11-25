import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { RegisteredmemberPayload } from "../decorators/payload/RegisteredmemberPayload";

export async function postAuthRegisteredMemberRefresh(props: {
  registeredMember: RegisteredmemberPayload;
  body: IEconPoliticalDiscussionRegisteredMember.IRefresh;
}): Promise<IEconPoliticalDiscussionRegisteredMember.IAuthorized> {
  // Step 1: Verify and decode the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "registeredmember";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "registeredmember";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Step 2: Validate token type matches expected actor type
  if (decoded.type !== "registeredmember") {
    throw new HttpException("Invalid token type", 403);
  }

  // Step 3: Validate that the session_id matches current session
  if (decoded.session_id !== props.registeredMember.session_id) {
    throw new HttpException("Session mismatch", 403);
  }

  // Step 4: Validate user account still exists and is active
  const user = await MyGlobal.prisma.econ_political_discussion_users.findFirst({
    where: {
      id: decoded.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (!user) {
    throw new HttpException("Account not found or deactivated", 403);
  }

  // Step 5: Generate new tokens with same session_id for continuity
  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 6: Return user profile with new tokens
  return {
    id: user.id,
    display_name: user.display_name,
    email: user.email,
    bio: user.bio ?? undefined,
    avatar_url: user.avatar_url ?? undefined,
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at !== null ? toISOStringSafe(user.deleted_at) : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
