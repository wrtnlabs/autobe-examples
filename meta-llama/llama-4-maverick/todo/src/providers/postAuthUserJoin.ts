import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserJoin(props: {
  body: IUser.ICreate;
}): Promise<IUser.IAuthorized> {
  const { body } = props;
  const hashedPassword = await PasswordUtil.hash(body.password_hash);
  const userId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const createdUser = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: userId,
      username: body.username,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      created_at: true,
      updated_at: true,
    },
  });

  const accessToken = jwt.sign(
    {
      userId: createdUser.id,
      type: "user",
      username: body.username,
      created_at: createdUser.created_at,
      updated_at: createdUser.updated_at,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: createdUser.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(new Date(Date.now() + 3600000)), // 1 hour from now
    refreshable_until: toISOStringSafe(new Date(Date.now() + 604800000)), // 7 days from now
  };

  return {
    id: createdUser.id as string & tags.Format<"uuid">,
    token,
  };
}
