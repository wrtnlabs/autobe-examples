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

export async function postAuthUserJoin(props: {
  body: ITodoListUser.ICreate;
}): Promise<ITodoListUser.IAuthorized> {
  const { body } = props;

  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (existingUser) {
    throw new HttpException("Conflict: Email already registered", 409);
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;
  const hashedPassword = await PasswordUtil.hash(body.password);

  const createdUser = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id,
      email: body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
    },
  });

  const accessTokenExpiry = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshTokenExpiry = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  const accessToken = jwt.sign(
    {
      id: createdUser.id,
      type: "user",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: createdUser.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: createdUser.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExpiry,
      refreshable_until: refreshTokenExpiry,
    },
  };
}
