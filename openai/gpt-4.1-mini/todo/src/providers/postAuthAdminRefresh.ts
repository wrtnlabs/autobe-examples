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

export async function postAuthAdminRefresh(props: {
  admin: AdminPayload;
  body: ITodoListAdmin.IRefresh;
}): Promise<ITodoListAdmin.IAuthorized> {
  const { body } = props;

  let decodedPayload: {
    id: string & tags.Format<"uuid">;
    email: string;
    type: string;
  };

  try {
    const decoded = jwt.verify(body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "id" in decoded &&
      "email" in decoded &&
      "type" in decoded
    ) {
      decodedPayload = {
        id: decoded.id as string & tags.Format<"uuid">,
        email: String(decoded.email),
        type: String(decoded.type),
      };
    } else {
      throw new HttpException(
        "Unauthorized: Invalid refresh token payload",
        401,
      );
    }
  } catch {
    throw new HttpException("Unauthorized: Invalid refresh token", 401);
  }

  if (decodedPayload.type !== "admin") {
    throw new HttpException("Unauthorized: Invalid user type", 401);
  }

  const admin = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: { id: decodedPayload.id, deleted_at: null },
  });

  if (admin === null) {
    throw new HttpException("Unauthorized: Admin not found or deleted", 401);
  }

  const nowISOString = toISOStringSafe(new Date());

  const accessTokenExpiresInMs = 1000 * 60 * 60; // 1 hour
  const refreshTokenExpiresInMs = 1000 * 60 * 60 * 24 * 7; // 7 days

  const accessToken = jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: admin.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(
        new Date(Date.now() + accessTokenExpiresInMs),
      ),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + refreshTokenExpiresInMs),
      ),
    },
  };
}
