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

export async function putAuthUserPassword(props: {
  user: UserPayload;
  body: ITodoListUser.IChangePassword;
}): Promise<ITodoListUser.IAuthorized> {
  const { user, body } = props;

  const dbUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: user.id,
      deleted_at: null,
    },
  });

  if (!dbUser) {
    throw new HttpException("User not found or has been deleted", 404);
  }

  const isCurrentPasswordValid = await PasswordUtil.verify(
    body.current_password,
    dbUser.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  const isSamePassword = await PasswordUtil.verify(
    body.new_password,
    dbUser.password_hash,
  );

  if (isSamePassword) {
    throw new HttpException(
      "New password must be different from current password",
      400,
    );
  }

  const newPasswordHash = await PasswordUtil.hash(body.new_password);
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: now,
    },
  });

  await MyGlobal.prisma.todo_list_refresh_tokens.updateMany({
    where: {
      todo_list_user_id: user.id,
      revoked_at: null,
    },
    data: {
      revoked_at: now,
    },
  });

  const accessTokenExpiryDate = new Date();
  accessTokenExpiryDate.setMinutes(accessTokenExpiryDate.getMinutes() + 15);
  const accessTokenExpiry = toISOStringSafe(accessTokenExpiryDate);

  const accessToken = jwt.sign(
    { id: user.id, type: "user" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m" },
  );

  const refreshTokenValue = v4();
  const refreshTokenHash = await PasswordUtil.hash(refreshTokenValue);

  const refreshTokenExpiryDate = new Date();
  refreshTokenExpiryDate.setDate(refreshTokenExpiryDate.getDate() + 30);
  const refreshTokenExpiry = toISOStringSafe(refreshTokenExpiryDate);

  await MyGlobal.prisma.todo_list_refresh_tokens.create({
    data: {
      id: v4(),
      todo_list_user_id: user.id,
      token_hash: refreshTokenHash,
      expires_at: refreshTokenExpiry,
      created_at: now,
    },
  });

  return {
    id: user.id,
    token: {
      access: accessToken,
      refresh: refreshTokenValue,
      expired_at: accessTokenExpiry,
      refreshable_until: refreshTokenExpiry,
    },
  };
}
