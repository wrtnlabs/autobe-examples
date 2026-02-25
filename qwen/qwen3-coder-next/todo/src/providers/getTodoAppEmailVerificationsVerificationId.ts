import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppUserEmailVerificationTransformer } from "../transformers/TodoAppUserEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppEmailVerificationsVerificationId(props: {
  verificationId: string;
}): Promise<ITodoAppUserEmailVerification> {
  const verification =
    await MyGlobal.prisma.todo_app_user_email_verifications.findUniqueOrThrow({
      where: { id: props.verificationId },
      ...TodoAppUserEmailVerificationTransformer.select(),
    });
  return await TodoAppUserEmailVerificationTransformer.transform(verification);
}
