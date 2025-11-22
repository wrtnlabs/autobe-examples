import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";
import { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { SystemadministratorPayload } from "../decorators/payload/SystemadministratorPayload";

export async function postAuthSystemAdministratorJoin(props: {
  systemAdministrator: SystemadministratorPayload;
  body: IEconPoliticalDiscussionUser.ICreate;
}): Promise<IEconPoliticalDiscussionSystemAdministrator.IAuthorized> {
  // Validate required fields for admin registration
  if (!props.body.email) {
    throw new HttpException("Email is required for admin registration", 400);
  }

  if (!props.body.display_name) {
    throw new HttpException(
      "Display name is required for admin registration",
      400,
    );
  }

  // Check for duplicate email registration
  const existingUser =
    await MyGlobal.prisma.econ_political_discussion_users.findFirst({
      where: { email: props.body.email },
    });

  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Create system administrator user record with default admin status
  const user = await MyGlobal.prisma.econ_political_discussion_users.create({
    data: {
      id: v4(),
      display_name: props.body.display_name,
      email: props.body.email,
      bio: props.body.bio ?? null,
      avatar_url: props.body.avatar_url ?? null,
      status: "active", // System administrators are always created as active
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Create session record for the new admin
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const sessionId = v4();

  // Generate JWT tokens with proper admin payload structure
  const token = {
    access: jwt.sign(
      {
        type: "systemAdministrator",
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
        type: "systemAdministrator",
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

  // Return admin profile with authentication tokens
  return {
    id: user.id,
    display_name: user.display_name,
    email: user.email,
    bio: user.bio ?? undefined,
    avatar_url: user.avatar_url ?? undefined,
    status: "active",
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
    token,
  };
}
