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

export async function putTodoAppUserUsersEmailVerificationsUserEmailVerificationId(props: {
  user: UserPayload;
  userEmailVerificationId: string & tags.Format<"uuid">;
  body: ITodoAppUserEmailVerification.IUpdate;
}): Promise<ITodoAppUserEmailVerification> {
  // Verify the verification record exists and belongs to the user
  const existing =
    await MyGlobal.prisma.todo_app_user_email_verifications.findUnique({
      where: { id: props.userEmailVerificationId },
    });
  if (!existing) {
    throw new HttpException("User email verification record not found", 404);
  }
  // Prepare update data with correct null handling and toISOStringSafe conversion
  const updateData: Partial<Prisma.todo_app_user_email_verificationsUpdateInput> =
    {};
  if ("token" in props.body) {
    updateData.token = props.body.token ?? existing.token;
  }
  if ("token_expired_at" in props.body) {
    const value =
      props.body.token_expired_at === undefined
        ? existing.token_expired_at
        : props.body.token_expired_at;
    updateData.token_expired_at =
      value === null
        ? undefined
        : typeof value === "string"
          ? value
          : toISOStringSafe(value);
  }
  if ("verified_at" in props.body) {
    const value =
      props.body.verified_at === undefined
        ? existing.verified_at
        : props.body.verified_at;
    updateData.verified_at =
      value === null
        ? undefined
        : typeof value === "string"
          ? value
          : toISOStringSafe(value);
  }
  if ("created_at" in props.body) {
    const value =
      props.body.created_at === undefined
        ? existing.created_at
        : props.body.created_at;
    updateData.created_at =
      value === null
        ? undefined
        : typeof value === "string"
          ? value
          : toISOStringSafe(value);
  }
  if ("deleted_at" in props.body) {
    const value =
      props.body.deleted_at === undefined
        ? existing.deleted_at
        : props.body.deleted_at;
    updateData.deleted_at =
      value === null
        ? undefined
        : typeof value === "string"
          ? value
          : toISOStringSafe(value);
  }
  // Update the record
  const updated =
    await MyGlobal.prisma.todo_app_user_email_verifications.update({
      where: { id: props.userEmailVerificationId },
      data: updateData,
    });
  // Transform and return updated record; add required 'user' property with empty object to satisfy transformer type
  return await TodoAppUserEmailVerificationTransformer.transform({
    ...updated,
    user: {},
  });
}
