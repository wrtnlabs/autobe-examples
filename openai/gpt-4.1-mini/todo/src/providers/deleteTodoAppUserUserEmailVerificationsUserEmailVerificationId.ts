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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserUserEmailVerificationsUserEmailVerificationId(props: {
  user: UserPayload;
  userEmailVerificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.todo_app_user_email_verifications.findUnique({
      where: {
        id: props.userEmailVerificationId,
      },
    });
  if (!existing) {
    throw new HttpException("User email verification not found", 404);
  }
  if (existing.user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden - email verification does not belong to user",
      403,
    );
  }
  await MyGlobal.prisma.todo_app_user_email_verifications.delete({
    where: {
      id: props.userEmailVerificationId,
    },
  });
}
