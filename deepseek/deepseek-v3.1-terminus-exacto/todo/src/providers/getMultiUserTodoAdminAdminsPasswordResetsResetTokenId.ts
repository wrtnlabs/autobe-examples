import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { IMultiUserTodoAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoAdminPasswordResetTransformer } from "../transformers/MultiUserTodoAdminPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoAdminAdminsPasswordResetsResetTokenId(props: {
  admin: AdminPayload;
  resetTokenId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoAdminPasswordReset> {
  const passwordReset =
    await MyGlobal.prisma.multi_user_todo_admin_password_resets.findUniqueOrThrow(
      {
        where: { id: props.resetTokenId },
        ...MultiUserTodoAdminPasswordResetTransformer.select(),
      },
    );
  return await MultiUserTodoAdminPasswordResetTransformer.transform(
    passwordReset,
  );
}
