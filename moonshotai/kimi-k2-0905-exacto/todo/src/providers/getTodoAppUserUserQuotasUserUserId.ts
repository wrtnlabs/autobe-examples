import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUserQuota } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserQuota";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserUserQuotasUserUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserQuota> {
  // Verify authorization - users can only access their own quota data
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "You can only access your own quota information",
      403,
    );
  }

  // Retrieve quota data with user information
  const quotaData = await MyGlobal.prisma.todo_app_user_quotas.findUnique({
    where: {
      todo_app_user_id: props.userId,
    },
    include: {
      user: true,
    },
  });

  if (!quotaData) {
    throw new HttpException("Quota information not found for this user", 404);
  }

  // Construct and return the complete ITodoAppUserQuota structure
  return {
    id: quotaData.id,
    todo_app_user_id: quotaData.todo_app_user_id,
    max_tasks: quotaData.max_tasks,
    max_categories: quotaData.max_categories,
    max_daily_task_creations: quotaData.max_daily_task_creations,
    current_task_count: quotaData.current_task_count,
    current_category_count: quotaData.current_category_count,
    daily_task_creation_count: quotaData.daily_task_creation_count,
    is_premium: quotaData.is_premium,
    quota_reset_date: quotaData.quota_reset_date
      ? toISOStringSafe(quotaData.quota_reset_date)
      : null,
    created_at: toISOStringSafe(quotaData.created_at),
    updated_at: toISOStringSafe(quotaData.updated_at),
    user: {
      id: quotaData.user.id,
      email: quotaData.user.email,
      created_at: toISOStringSafe(quotaData.user.created_at),
      updated_at: toISOStringSafe(quotaData.user.updated_at),
      deleted_at: quotaData.user.deleted_at
        ? toISOStringSafe(quotaData.user.deleted_at)
        : undefined,
    },
  };
}
