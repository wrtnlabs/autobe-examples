import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { SystemadministratorPayload } from "../decorators/payload/SystemadministratorPayload";

export async function postAuthSystemAdministratorRefresh(props: {
  systemAdministrator: SystemadministratorPayload;
}): Promise<IEconPoliticalDiscussionSystemAdministrator.IAuthorized> {
  // Verify the user still exists and is active
  const user = await MyGlobal.prisma.econ_political_discussion_users.findUnique(
    {
      where: { id: props.systemAdministrator.id },
    },
  );

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Generate new access and refresh tokens with same session_id for continuity
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "systemAdministrator",
        id: user.id,
        session_id: props.systemAdministrator.session_id, // Maintain same session for continuity
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
        session_id: props.systemAdministrator.session_id, // Maintain same session for continuity
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
    status: "active" as const,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? undefined : toISOStringSafe(user.deleted_at),
    token,
  };
}
