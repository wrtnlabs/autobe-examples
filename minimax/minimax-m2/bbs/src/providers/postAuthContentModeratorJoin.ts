import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionContentModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionContentModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ContentmoderatorPayload } from "../decorators/payload/ContentmoderatorPayload";

export async function postAuthContentModeratorJoin(props: {
  contentModerator: ContentmoderatorPayload;
  body: IEconPoliticalDiscussionContentModerator.ICreate;
}): Promise<IEconPoliticalDiscussionContentModerator.IAuthorized> {
  // Check for existing account with same email
  const existingUser =
    await MyGlobal.prisma.econ_political_discussion_users.findFirst({
      where: { email: props.body.email },
    });

  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Create new content moderator user record
  const user = await MyGlobal.prisma.econ_political_discussion_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      avatar_url: props.body.avatar_url ?? null,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });

  // Generate JWT tokens directly after user creation
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const sessionId = v4() as string & tags.Format<"uuid">;

  const accessToken = jwt.sign(
    {
      type: "content_moderator",
      id: user.id,
      session_id: sessionId,
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
      type: "content_moderator",
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
  );

  // Return authorized response with user data and tokens
  return {
    id: user.id,
    display_name: user.display_name,
    email: user.email,
    bio: user.bio ?? undefined, // Convert null to undefined for optional field
    avatar_url: user.avatar_url ?? undefined, // Convert null to undefined for optional field
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
