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

export async function postAuthContentModeratorLogin(props: {
  contentModerator: ContentmoderatorPayload;
  body: IEconPoliticalDiscussionContentModerator.ILogin;
}): Promise<IEconPoliticalDiscussionContentModerator.IAuthorized> {
  // Find content moderator user by email
  const user = await MyGlobal.prisma.econ_political_discussion_users.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify user is active content moderator
  if (user.status !== "active") {
    throw new HttpException(
      "Account is not active for content moderation",
      403,
    );
  }

  // Generate session ID for token payload
  const sessionId = v4() as string & tags.Format<"uuid">;

  // Generate JWT tokens without session storage (token-based auth)
  const now = new Date();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const token = {
    access: jwt.sign(
      {
        type: "content_moderator",
        id: user.id,
        session_id: sessionId,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "content_moderator",
        id: user.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } satisfies IAuthorizationToken;

  // Return authorized response
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
