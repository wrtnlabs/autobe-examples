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

export async function postAuthRegisteredMemberJoin(props: {
  registeredMember: RegisteredmemberPayload;
  body: IEconPoliticalDiscussionRegisteredMember.ICreate;
}): Promise<IEconPoliticalDiscussionRegisteredMember.IAuthorized> {
  // Step 1: Validate unique email constraint
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

  // Step 2: Create user actor record with required fields
  const user = await MyGlobal.prisma.econ_political_discussion_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      display_name: props.body.display_name,
      email: props.body.email,
      bio: props.body.bio,
      avatar_url: props.body.avatar_url,
      status: "active",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Step 3: Generate JWT tokens without session record (since sessions table doesn't exist)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const token = {
    access: jwt.sign(
      {
        type: "registeredmember",
        id: user.id,
        session_id: v4() as string & tags.Format<"uuid">, // Generate temporary session ID
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
        type: "registeredmember",
        id: user.id,
        session_id: v4() as string & tags.Format<"uuid">,
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

  // Step 4: Return user profile with authentication tokens
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
