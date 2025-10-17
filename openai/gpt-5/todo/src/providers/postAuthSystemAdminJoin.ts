import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthSystemAdminJoin(props: {
  body: ITodoListSystemAdmin.ICreate;
}): Promise<ITodoListSystemAdmin.IAuthorized> {
  const { body } = props;

  // Normalize email to lowercase for uniqueness and storage policy
  const normalizedEmail = body.email.toLowerCase();

  // Pre-check for duplicate email (case-insensitive by normalization)
  const existing = await MyGlobal.prisma.todo_list_system_admins.findFirst({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("Conflict: Email already registered", 409);
  }

  // Hash password
  const passwordHash = await PasswordUtil.hash(body.password);

  // Prepare identifiers and timestamps
  const id = v4();
  const now = toISOStringSafe(new Date());

  try {
    // Create new admin
    await MyGlobal.prisma.todo_list_system_admins.create({
      data: {
        id: id,
        email: normalizedEmail,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Unique constraint failed (email)
      throw new HttpException("Conflict: Email already registered", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }

  // Generate JWT tokens
  const accessToken = ((): string => {
    return jwt.sign(
      { id: id, type: "systemadmin" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );
  })();

  const refreshToken = ((): string => {
    return jwt.sign(
      { id: id, type: "systemadmin" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );
  })();

  // Compute token expiry timestamps
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Build authorized response (include optional admin profile)
  const result = typia.assert<ITodoListSystemAdmin.IAuthorized>({
    id: id,
    email: normalizedEmail,
    created_at: now,
    updated_at: now,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
    admin: {
      id: id,
      email: normalizedEmail,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return result;
}
