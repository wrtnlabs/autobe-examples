import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: ITodoListAdmin.ICreate;
}): Promise<ITodoListAdmin.IAuthorized> {
  const { body } = props;

  const existing = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (existing !== null) {
    throw new HttpException(
      `Admin with email "${body.email}" already exists`,
      409,
    );
  }

  const hashedPassword = await PasswordUtil.hash(body.password_hash);

  const now = toISOStringSafe(new Date());

  // Helper function to generate UUID with correct type
  function generateUuid(): string & tags.Format<"uuid"> {
    return v4();
  }

  const newId = generateUuid();

  const created = await MyGlobal.prisma.todo_list_admins.create({
    data: {
      id: newId,
      email: body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
    },
  });

  // Compute expiry dates using Date and convert to ISO string
  const expiredAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  return {
    id: created.id,
    email: created.email,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    token: {
      access: jwt.sign(
        { userId: created.id, email: created.email },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        { userId: created.id, tokenType: "refresh" },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
