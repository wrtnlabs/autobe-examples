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

export async function postEconomicDiscussionAuthSuperAdministratorLogin(props: {
  body: IEconomicDiscussionSuperAdministrator.ILogin;
}): Promise<IEconomicDiscussionSuperAdministrator.IAuthorized> {
  // Validate super administrator credentials
  const superAdmin =
    await MyGlobal.prisma.economic_discussion_super_administrators.findFirst({
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!superAdmin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password using bcrypt
  const isValid = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Create a new session record
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session =
    await MyGlobal.prisma.economic_discussion_super_administrator_sessions.create(
      {
        data: {
          id: v4(),
          super_administrator_id: superAdmin.id,
          created_at: now,
          expired_at: accessExpires,
          ip: "", // Fixed: null -> empty string
          href: "", // Fixed: null -> empty string
          referrer: "", // Fixed: null -> empty string
        },
      },
    );
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "superAdministrator",
        id: superAdmin.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "superAdministrator",
        id: superAdmin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // Return authorized response
  return {
    id: superAdmin.id,
    token: token,
  } satisfies IEconomicDiscussionSuperAdministrator.IAuthorized;
}
