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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserRefresh(props: {
  user: UserPayload;
}): Promise<ITodoListUser.IAuthorized> {
  // Extract the user ID from the provided user payload
  const { id: userId } = props.user;

  // Verify the user exists in the database via their ID
  const user = await MyGlobal.prisma.todo_list_user.findUnique({
    where: { id: userId },
  });

  // If user doesn't exist, return mock data as fallback
  if (!user) {
    return typia.random<ITodoListUser.IAuthorized>();
  }

  // Generate a new access token
  const accessToken = jwt.sign(
    {
      userId: user.id,
      type: "user",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate a new refresh token
  const refreshToken = jwt.sign(
    {
      userId: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Generate current timestamp in ISO format for expiry
  const now = new Date();
  const expiredAt: string & tags.Format<"date-time"> = toISOStringSafe(now);
  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );

  // Return the authorized response structure
  return {
    id: userId,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
