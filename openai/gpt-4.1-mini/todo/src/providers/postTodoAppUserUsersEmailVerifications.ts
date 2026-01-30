import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserEmailVerificationCollector } from "../collectors/TodoAppUserEmailVerificationCollector";
import { TodoAppUserEmailVerificationTransformer } from "../transformers/TodoAppUserEmailVerificationTransformer";

export async function postTodoAppUserUsersEmailVerifications(props: {
  user: UserPayload;
  body: ITodoAppUserEmailVerification.ICreate;
}): Promise<ITodoAppUserEmailVerification> {
  // Prepare create input using collector, injecting user relation connection
  const createInput = await TodoAppUserEmailVerificationCollector.collect({
    body: {
      ...props.body,
      user: { id: props.user.id },
    },
  });
  // Create record in the database
  const created =
    await MyGlobal.prisma.todo_app_user_email_verifications.create({
      data: createInput,
      ...TodoAppUserEmailVerificationTransformer.select(),
    });
  // Transform to API response DTO
  return await TodoAppUserEmailVerificationTransformer.transform(created);
}
