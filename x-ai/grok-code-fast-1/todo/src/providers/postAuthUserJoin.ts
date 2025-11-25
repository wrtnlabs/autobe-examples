import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserJoin(props: {
  body: ITodoListUser.IJoin;
}): Promise<ITodoListUser.IAuthorized> {
  // Ensure unique email
  const exists = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: props.body.email },
  });
  if (exists) {
    throw new HttpException("Email address is already registered.", 409);
  }

  // Secure password hashing
  const password_hash = await PasswordUtil.hash(props.body.password);
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const user_id: string & tags.Format<"uuid"> = v4();

  // Insert user (pending confirmation, not deleted)
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: user_id,
      email: props.body.email,
      password_hash: password_hash,
      display_name: props.body.display_name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Placeholder for triggering confirmation email workflow
  // await ConfirmationWorkflow.send(user.email, user.id);

  // JWT token issuance is required by endpoint contract
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session_id: string & tags.Format<"uuid"> = v4(); // One-off session for registration context

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session_id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session_id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: null,
    token,
  };
}
