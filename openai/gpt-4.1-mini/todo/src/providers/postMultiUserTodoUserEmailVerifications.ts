import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { IMultiUserTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoUserEmailVerificationCollector } from "../collectors/MultiUserTodoUserEmailVerificationCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { MultiUserTodoUserEmailVerificationTransformer } from "../transformers/MultiUserTodoUserEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoUserEmailVerifications(props: {
  user: UserPayload;
  body: IMultiUserTodoUserEmailVerification.ICreate;
}): Promise<IMultiUserTodoUserEmailVerification> {
  const userRecord = await MyGlobal.prisma.multi_user_todo_users.findFirst({
    where: { id: props.body.multiUserTodoUserId, deleted_at: null },
    select: { id: true },
  });
  if (userRecord === null) {
    throw new HttpException("User does not exist or is deleted", 400);
  }
  const existingToken =
    await MyGlobal.prisma.multi_user_todo_user_email_verifications.findUnique({
      where: { token: props.body.token },
    });
  if (existingToken !== null) {
    throw new HttpException("Token already exists", 400);
  }
  const data = await MultiUserTodoUserEmailVerificationCollector.collect({
    body: props.body,
  });
  const created =
    await MyGlobal.prisma.multi_user_todo_user_email_verifications.create({
      data,
      ...MultiUserTodoUserEmailVerificationTransformer.select(),
    });
  return await MultiUserTodoUserEmailVerificationTransformer.transform(created);
}
