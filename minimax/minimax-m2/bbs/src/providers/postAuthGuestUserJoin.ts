import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionGuestUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

export async function postAuthGuestUserJoin(props: {
  guestUser: GuestuserPayload;
  body: IEconPoliticalDiscussionGuestUser.ICreate;
}): Promise<IEconPoliticalDiscussionGuestUser.IAuthorized> {
  // Check for duplicate email
  const existingUser =
    await MyGlobal.prisma.econ_political_discussion_users.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
    });
  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Create the guest user record
  const user = await MyGlobal.prisma.econ_political_discussion_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      display_name: props.body.display_name,
      email: props.body.email,
      bio: props.body.bio ?? null,
      avatar_url: props.body.avatar_url ?? null,
      status: "active",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  // Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Generate session ID for JWT payload (following the pattern from other auth systems)
  const sessionId = v4() as string & tags.Format<"uuid">;

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "guestuser",
        id: user.id,
        session_id: sessionId,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "guestuser",
        id: user.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
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

  // Return the authorized user response
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
    token,
  };
}
