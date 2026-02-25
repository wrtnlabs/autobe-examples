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
import { UserPayload } from "../decorators/payload/UserPayload";
import { MultiUserTodoUserEmailVerificationTransformer } from "../transformers/MultiUserTodoUserEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoUserEmailVerifications(props: {
  user: UserPayload;
  body: IMultiUserTodoUserEmailVerification.IRequest;
}): Promise<IMultiUserTodoUserEmailVerification> {
  if (!props.body.token) {
    throw new HttpException("Token is required.", 400);
  }
  const now = toISOStringSafe(new Date());
  const verification =
    await MyGlobal.prisma.multi_user_todo_user_email_verifications.findFirstOrThrow(
      {
        where: {
          token: props.body.token,
          expires_at: { gte: now },
          deleted_at: null,
        },
        ...MultiUserTodoUserEmailVerificationTransformer.select(),
      },
    );
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.multi_user_todo_users.update({
      where: { id: verification.multi_user_todo_user_id },
      data: {
        updated_at: now,
      },
    });
    await tx.multi_user_todo_user_email_verifications.update({
      where: { id: verification.id },
      data: { deleted_at: now },
    });
  });
  return await MultiUserTodoUserEmailVerificationTransformer.transform(
    verification,
  );
}
