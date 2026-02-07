import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ITodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoUserEmailVerificationTransformer } from "../transformers/TodoUserEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoUserEmailVerifications(props: {
  user: UserPayload;
  body: ITodoUserEmailVerification.ICreate;
}): Promise<ITodoUserEmailVerification> {
  const data = {
    id: v4(),
    token: Math.random().toString(36).substr(2, 16),
    expires_at: new Date(Date.now() + 15 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    user: { connect: { id: props.user.id } },
  };
  const created = await MyGlobal.prisma.todo_user_email_verifications.create({
    data,
  });
  return await TodoUserEmailVerificationTransformer.transform(created);
}
