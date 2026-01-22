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

export async function putTodoAppUserUserPasswordResetsUserPasswordResetId(props: {
  user: UserPayload;
  userPasswordResetId: string & tags.Format<"uuid">;
  body: ITodoAppUserPasswordReset.IUpdate;
}): Promise<ITodoAppUserPasswordReset> {
  const existing =
    await MyGlobal.prisma.todo_app_user_password_resets.findUnique({
      where: { id: props.userPasswordResetId },
    });
  if (!existing) {
    throw new HttpException("User password reset entry not found", 404);
  }
  if (existing.todo_app_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: Not the owner of this password reset entry",
      403,
    );
  }
  const updated = await MyGlobal.prisma.todo_app_user_password_resets.update({
    where: { id: props.userPasswordResetId },
    data: {
      token:
        props.body.token === null || props.body.token === undefined
          ? undefined
          : props.body.token,
      expires_at:
        props.body.expires_at === null || props.body.expires_at === undefined
          ? undefined
          : toISOStringSafe(props.body.expires_at),
      requested_at:
        props.body.requested_at === null ||
        props.body.requested_at === undefined
          ? undefined
          : toISOStringSafe(props.body.requested_at),
      created_at:
        props.body.created_at === null || props.body.created_at === undefined
          ? undefined
          : toISOStringSafe(props.body.created_at),
      updated_at:
        props.body.updated_at === null || props.body.updated_at === undefined
          ? undefined
          : toISOStringSafe(props.body.updated_at),
      deleted_at:
        props.body.deleted_at === null || props.body.deleted_at === undefined
          ? undefined
          : toISOStringSafe(props.body.deleted_at),
    },
    ...TodoAppUserPasswordResetTransformer.select(),
  });
  return TodoAppUserPasswordResetTransformer.transform(updated);
}
