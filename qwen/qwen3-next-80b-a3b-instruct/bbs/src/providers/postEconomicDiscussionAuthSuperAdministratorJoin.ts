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

export async function postEconomicDiscussionAuthSuperAdministratorJoin(props: {
  body: IEconomicDiscussionSuperAdministrator.IJoin;
}): Promise<IEconomicDiscussionSuperAdministrator.IAuthorized> {
  // Validate email uniqueness
  const existing =
    await MyGlobal.prisma.economic_discussion_super_administrators.findFirst({
      where: { email: props.body.email },
    });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Generate UUID for super administrator
  const superAdministratorId = v4() as string & tags.Format<"uuid">;
  // Hash password using PasswordUtil.hash()
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Create super administrator record
  const superAdministrator =
    await MyGlobal.prisma.economic_discussion_super_administrators.create({
      data: {
        id: superAdministratorId,
        email: props.body.email,
        password_hash: passwordHash,
        display_name: props.body.display_name,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  // Generate UUID for session
  const sessionId = v4() as string & tags.Format<"uuid">;
  // Set token expiration times using toISOStringSafe(new Date()) for creation
  // We must convert Date to string immediately
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Create super administrator session record
  const session =
    await MyGlobal.prisma.economic_discussion_super_administrator_sessions.create(
      {
        data: {
          id: sessionId,
          super_administrator_id: superAdministratorId,
          created_at: toISOStringSafe(now),
          expired_at: toISOStringSafe(accessExpires),
          // Include required properties for Prisma schema - replace null with empty string
          ip: "",
          href: "",
          referrer: "",
          // refreshable_until removed - not in Prisma model schema
        },
      },
    );
  // Generate JWT tokens with proper string & tags.Format<'date-time'>
  const accessToken = jwt.sign(
    {
      type: "superAdministrator",
      id: superAdministratorId,
      session_id: sessionId,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "superAdministrator",
      id: superAdministratorId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Return authorized response with tokens and properly typed dates
  return {
    id: superAdministratorId,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
      refreshable_until: toISOStringSafe(refreshExpires) as string &
        tags.Format<"date-time">,
    },
  } satisfies IEconomicDiscussionSuperAdministrator.IAuthorized;
}
