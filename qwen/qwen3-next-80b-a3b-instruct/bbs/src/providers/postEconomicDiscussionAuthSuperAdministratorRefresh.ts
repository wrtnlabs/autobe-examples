import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicDiscussionAuthSuperAdministratorRefresh(props: {
  body: IEconomicDiscussionSuperAdministrator.IRefresh;
}): Promise<IEconomicDiscussionSuperAdministrator.IAuthorized> {
  // Verify refresh token (JWT)
  let decoded: {
    id: string;
    session_id: string;
    type: "superAdministrator";
  };
  try {
    decoded = jwt.verify(props.body.token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "superAdministrator";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate token type
  if (decoded.type !== "superAdministrator") {
    throw new HttpException("Invalid token type", 403);
  }
  // Validate session exists and is active
  const session =
    await MyGlobal.prisma.economic_discussion_super_administrator_sessions.findUnique(
      {
        where: {
          id: decoded.session_id,
          super_administrator_id: decoded.id,
        },
      },
    );
  if (!session || new Date(session.expired_at) < new Date()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate actor is still active
  const superAdmin =
    await MyGlobal.prisma.economic_discussion_super_administrators.findUnique({
      where: { id: decoded.id },
    });
  if (!superAdmin || superAdmin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Generate new tokens
  const now: number = Date.now();
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now + 7 * 24 * 60 * 60 * 1000),
  );
  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date(now)),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date(now)),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Update session expiration time - refresh token is not stored in database
  // JWTs are stateless; the refresh token is validated via signature and expiration
  // We only update the session's expired_at timestamp to extend the session
  await MyGlobal.prisma.economic_discussion_super_administrator_sessions.update(
    {
      where: { id: decoded.session_id },
      data: {
        expired_at: refreshExpires,
      },
    },
  );
  // Return authorized response
  return {
    id: decoded.id,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
