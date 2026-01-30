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

export async function patchTodoAppUserUsersEmailVerifications(props: {
  user: UserPayload;
  body: ITodoAppUserEmailVerification.IRequest;
}): Promise<ITodoAppUserEmailVerification> {
  // Find existing email verification record for the user
  const existing =
    await MyGlobal.prisma.todo_app_user_email_verifications.findFirst({
      where: {
        user_id: props.user.id,
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new HttpException("Email verification record not found", 404);
  }
  // Prepare update data
  const updateData: {
    token?: string;
    token_expired_at?: string;
    verified_at?: string;
  } = {};
  if (props.body.token !== undefined) {
    updateData.token = props.body.token;
  }
  if (
    props.body.token_expired_at !== undefined &&
    props.body.token_expired_at !== null
  ) {
    updateData.token_expired_at =
      typeof props.body.token_expired_at === "string"
        ? props.body.token_expired_at
        : toISOStringSafe(props.body.token_expired_at);
  }
  if (props.body.verified_at !== undefined && props.body.verified_at !== null) {
    updateData.verified_at =
      typeof props.body.verified_at === "string"
        ? props.body.verified_at
        : toISOStringSafe(props.body.verified_at);
  }
  // Update the record
  const updated =
    await MyGlobal.prisma.todo_app_user_email_verifications.update({
      where: { id: existing.id },
      data: updateData,
    });
  // Map dates as string & tags.Format<'date-time'> using toISOStringSafe
  return {
    id: updated.id as string & tags.Format<"uuid">,
    user: {}, // user summary is empty based on transformer specs
    token: updated.token,
    token_expired_at: updated.token_expired_at
      ? toISOStringSafe(updated.token_expired_at)
      : null,
    verified_at: updated.verified_at
      ? toISOStringSafe(updated.verified_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
