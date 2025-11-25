import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.IJoin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // Check for duplicate email
  const existingAdmin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { email: props.body.email },
  });
  if (existingAdmin !== null) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash the password
  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  // Generate UUID for admin
  const adminId: string & tags.Format<"uuid"> = v4() as unknown as string &
    tags.Format<"uuid">;

  const nowIso = toISOStringSafe(new Date());

  // Create the admin record
  const admin = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: nowIso,
      updated_at: nowIso,
    },
  });

  // Calculate expiration dates for access and refresh tokens
  const accessExpiresDate: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresDate: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Generate UUID for session
  const sessionId: string & tags.Format<"uuid"> = v4() as unknown as string &
    tags.Format<"uuid">;

  // Create session record
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_admin_id: admin.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowIso,
      expired_at: accessExpiresDate,
    },
  });

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresDate,
    refreshable_until: refreshExpiresDate,
  };

  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token,
  };
}
