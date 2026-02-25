import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { IMultiUserTodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { MultiUserTodoUserPasswordResetTransformer } from "../transformers/MultiUserTodoUserPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoUserPasswordResets(props: {
  user: UserPayload;
  body: IMultiUserTodoUserPasswordReset.IUpdate;
}): Promise<IMultiUserTodoUserPasswordReset> {
  const now = toISOStringSafe(new Date());
  const tokenRecord =
    await MyGlobal.prisma.multi_user_todo_user_password_resets.findUniqueOrThrow(
      {
        where: { token: props.body.token },
        include: { user: true },
      },
    );
  if (tokenRecord.deleted_at !== null) {
    throw new HttpException("Token is no longer valid.", 400);
  }
  const expiredAt = toISOStringSafe(tokenRecord.expired_at);
  if (expiredAt < now) {
    throw new HttpException("Token has expired.", 400);
  }
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.multi_user_todo_users.update({
      where: { id: tokenRecord.multi_user_todo_user_id },
      data: {
        updated_at: toISOStringSafe(new Date()),
      },
    });
    await prisma.multi_user_todo_user_password_resets.delete({
      where: { id: tokenRecord.id },
    });
  });
  const updatedRecord =
    await MyGlobal.prisma.multi_user_todo_user_password_resets.findUniqueOrThrow(
      {
        where: { id: tokenRecord.id },
        ...MultiUserTodoUserPasswordResetTransformer.select(),
      },
    );
  return await MultiUserTodoUserPasswordResetTransformer.transform(
    updatedRecord,
  );
}
