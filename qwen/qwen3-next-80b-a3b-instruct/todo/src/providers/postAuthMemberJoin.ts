import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import { ITodoListMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { TodoListUserTransformer } from "../transformers/TodoListUserTransformer";
import { TodoListUserSessionTransformer } from "../transformers/TodoListUserSessionTransformer";

export async function postAuthMemberJoin(props: {
  body: IMember.IJoin;
}): Promise<ITodoListMember.IAuthorized> {
  // Check for duplicate email
  const existing = await MyGlobal.prisma.todo_list_user.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Create actor record manually - no collector needed
  const user = await MyGlobal.prisma.todo_list_user.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
    ...TodoListUserTransformer.select(),
  });
  // Create session record manually - no collector needed
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: v4(),
      ip: "",
      href: "",
      referrer: "",
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
      user: { connect: { id: user.id } }, // Use relation name 'user' instead of foreign key 'user_id'
    },
    ...TodoListUserSessionTransformer.select(),
  });
  // Generate JWT tokens with exact payload structure
  const accessToken = jwt.sign(
    {
      type: "member", // actor type discriminator
      id: user.id, // actor's ID
      session_id: session.id, // session's ID
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Return IAuthorized type with token structure
  return {
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies ITodoListMember.IAuthorized;
}
