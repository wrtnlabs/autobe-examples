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
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserPasswordResetTransformer } from "../transformers/TodoAppUserPasswordResetTransformer";

export async function putTodoAppUserUsersPasswordResetsUserPasswordResetId(props: {
  user: UserPayload;
  userPasswordResetId: string & tags.Format<"uuid">;
  body: ITodoAppUserPasswordReset.IUpdate;
}): Promise<ITodoAppUserPasswordReset> {
  const existing =
    await MyGlobal.prisma.todo_app_user_password_resets.findFirst({
      where: {
        id: props.userPasswordResetId,
        todo_app_user_id: props.user.id,
        deleted_at: null,
      },
    });
  if (existing === null) {
    throw new HttpException("Password reset request not found", 404);
  }
  // Convert date strings to ISO strings safely for Prisma
  const convertDateField = (field?: string | null): string | undefined => {
    if (field === undefined) return undefined;
    if (field === null) return undefined;
    return toISOStringSafe(field);
  };
  const updated = await MyGlobal.prisma.todo_app_user_password_resets.update({
    where: {
      id: props.userPasswordResetId,
    },
    data: {
      ...props.body,
      deleted_at:
        props.body.deleted_at === undefined ? undefined : props.body.deleted_at,
      expires_at: convertDateField(props.body.expires_at),
      requested_at: convertDateField(props.body.requested_at),
    },
    ...TodoAppUserPasswordResetTransformer.select(),
  });
  return await TodoAppUserPasswordResetTransformer.transform(updated);
}
