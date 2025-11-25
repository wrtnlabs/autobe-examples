import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function postAuthSystemAdministratorLogin(props: {
  body: IEconPoliticalDiscussionUser.ILogin;
}): Promise<IEconPoliticalDiscussionSystemAdministrator.IAuthorized> {
  // Phase 1: Validate Actor Credentials
  const admin = await MyGlobal.prisma.econ_political_discussion_users.findFirst(
    {
      where: { email: props.body.email },
    },
  );

  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify account status is active
  if (admin.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  // Verify password using PasswordUtil - assuming password_hash field exists
  const isValid = await PasswordUtil.verify(
    props.body.password,
    (admin as any).password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Phase 2: Generate JWT tokens directly without session record
  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "systemAdministrator",
        id: admin.id,
        session_id: v4() as string & tags.Format<"uuid">,
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
        id: admin.id,
        session_id: v4() as string & tags.Format<"uuid">,
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

  // Return authorized admin profile with tokens
  return {
    id: admin.id,
    display_name: admin.display_name,
    email: admin.email,
    bio: admin.bio ?? undefined,
    avatar_url: admin.avatar_url ?? undefined,
    status: "active",
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at
      ? toISOStringSafe(admin.deleted_at)
      : undefined,
    token,
  };
}
