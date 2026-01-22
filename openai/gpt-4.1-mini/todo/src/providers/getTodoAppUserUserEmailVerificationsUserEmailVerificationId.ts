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
import { TodoAppUserEmailVerificationTransformer } from "../transformers/TodoAppUserEmailVerificationTransformer";

export async function getTodoAppUserUserEmailVerificationsUserEmailVerificationId(props: {
  user: UserPayload;
  userEmailVerificationId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserEmailVerification> {
  const found =
    await MyGlobal.prisma.todo_app_user_email_verifications.findUnique({
      where: { id: props.userEmailVerificationId },
      ...TodoAppUserEmailVerificationTransformer.select(),
    });
  if (!found)
    throw new HttpException("User email verification record not found", 404);
  return await TodoAppUserEmailVerificationTransformer.transform(found);
}
