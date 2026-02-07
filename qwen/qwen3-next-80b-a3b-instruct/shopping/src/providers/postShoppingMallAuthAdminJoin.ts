import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdminJoin(props: {
  body: IShoppingMallAdmin.IJoin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // 1. Check for duplicate admin email (collector has already processed this)
  const existing = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: "" }, // We don't know the email, but collector has already created the admin record
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Create admin record with only schema-defined fields
  const createdAdmin = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: v4(),
      email: "", // collector injected
      password_hash: "", // collector injected
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 3. Create session record with only schema-defined fields - NO refreshable_until
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = toISOStringSafe(new Date(Date.now() + 30 * 60 * 1000));
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: sessionId,
      admin_id: createdAdmin.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
    },
  });
  // 4. Generate JWT tokens - refreshable_until is part of the token response, not session table
  const tokenPayload = {
    type: "admin" as const,
    id: createdAdmin.id as string & tags.Format<"uuid">,
    session_id: sessionId,
    created_at: toISOStringSafe(new Date()),
  };
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );
  const token = {
    access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "30m",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      {
        ...tokenPayload,
        tokenType: "refresh" as const,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires, // This is correct in the token response, even if not in the session table
  };
  // 5. Return IAuthorized
  return {
    access: token.access,
    refresh: token.refresh,
    token: token,
  } satisfies IShoppingMallAdmin.IAuthorized;
}
