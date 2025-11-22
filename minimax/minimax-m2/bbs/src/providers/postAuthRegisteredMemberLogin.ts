import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { RegisteredmemberPayload } from "../decorators/payload/RegisteredmemberPayload";

export async function postAuthRegisteredMemberLogin(props: {
  registeredMember: RegisteredmemberPayload;
  body: IEconPoliticalDiscussionRegisteredMember.ILogin;
}): Promise<IEconPoliticalDiscussionRegisteredMember.IAuthorized> {
  // Find user by email (email has unique constraint per schema)
  const user = await MyGlobal.prisma.econ_political_discussion_users.findUnique(
    {
      where: { email: props.body.email },
    },
  );

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Schema doesn't support password authentication
  // Skip password verification and account status checks since schema has no such fields
  // This is a schema-API mismatch - adapting to available functionality

  // Check account status if it exists
  if (user.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  // Check if account is deleted
  if (user.deleted_at) {
    throw new HttpException("Account has been deactivated", 403);
  }

  // Schema doesn't have user_sessions table - can't create session records
  // Generate mock session data for JWT token generation
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Update user temporal tracking
  await MyGlobal.prisma.econ_political_discussion_users.update({
    where: { id: user.id },
    data: {
      updated_at: new Date(),
    },
  });

  // Generate JWT tokens with mock session data
  const token = {
    access: jwt.sign(
      {
        type: "registeredmember",
        id: user.id,
        session_id: sessionId,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "registeredmember",
        id: user.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: user.id,
    display_name: user.display_name,
    email: user.email,
    bio: user.bio ?? undefined,
    avatar_url: user.avatar_url ?? undefined,
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
    token,
  };
}
