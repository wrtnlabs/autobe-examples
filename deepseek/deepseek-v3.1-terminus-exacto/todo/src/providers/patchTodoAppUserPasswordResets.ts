import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserPasswordReset";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserPasswordResetAtSummaryTransformer } from "../transformers/TodoAppUserPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserPasswordResets(props: {
  user: UserPayload;
  body: ITodoAppUserPasswordReset.IRequest;
}): Promise<IPageITodoAppUserPasswordReset.ISummary> {
  const currentTime = toISOStringSafe(new Date());
  // Validate reset token belongs to authenticated user
  const resetRequest =
    await MyGlobal.prisma.todo_app_user_password_resets.findFirst({
      where: {
        reset_token: props.body.reset_token,
        todo_app_user_id: props.user.id,
        expires_at: { gt: currentTime },
        used_at: null,
        deleted_at: null,
      },
      include: {
        user: true,
      },
    });
  if (!resetRequest) {
    throw new HttpException(
      "Invalid, expired, or unauthorized reset token",
      400,
    );
  }
  // Update user password
  const hashedPassword = await PasswordUtil.hash(props.body.new_password);
  await MyGlobal.prisma.todo_app_users.update({
    where: { id: props.user.id },
    data: {
      password_hash: hashedPassword,
      updated_at: currentTime,
    },
  });
  // Mark reset token as used
  await MyGlobal.prisma.todo_app_user_password_resets.update({
    where: { id: resetRequest.id },
    data: {
      used_at: currentTime,
      updated_at: currentTime,
    },
  });
  // Return paginated list of reset tokens for the user
  const page = 1; // Use default value since page doesn't exist on IRequest
  const limit = 100; // Use default value since limit doesn't exist on IRequest
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.todo_app_user_password_resets.findMany({
    where: {
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...TodoAppUserPasswordResetAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_user_password_resets.count({
    where: {
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppUserPasswordResetAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
