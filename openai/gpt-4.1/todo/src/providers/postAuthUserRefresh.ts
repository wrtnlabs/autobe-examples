import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserRefresh(props: {
  body: ITodoListUser.IRefresh;
}): Promise<ITodoListUser.IAuthorized> {
  const { refresh_token } = props.body;

  let decoded;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (_err) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Payload validation: Must have id and type === "user"
  if (
    !decoded ||
    typeof decoded !== "object" ||
    !("id" in decoded) ||
    decoded.type !== "user"
  ) {
    throw new HttpException("Invalid refresh token payload", 401);
  }
  const id = decoded.id;
  if (typeof id !== "string") {
    throw new HttpException("Invalid refresh token payload", 401);
  }

  // Expect user to exist
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id },
  });
  if (!user) {
    throw new HttpException("User not found for this refresh token", 401);
  }

  // Issue new tokens
  const nowEpoch = Date.now();
  const accessExpiresAt = nowEpoch + 60 * 60 * 1000; // 1 hour
  const refreshExpiresAt = nowEpoch + 30 * 24 * 60 * 60 * 1000; // 30 days

  const payload = { id: user.id, type: "user" };
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30d",
    issuer: "autobe",
  });

  const expired_at = toISOStringSafe(new Date(accessExpiresAt));
  const refreshable_until = toISOStringSafe(new Date(refreshExpiresAt));

  return {
    id: user.id,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
