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

export async function postEconomicForumUserAuthUsersLogout(props: {
  user: UserPayload;
}): Promise<void> {
  // Validate that session_id exists in user payload
  if (!props.user.session_id) {
    throw new HttpException("Invalid session", 401);
  }
  // Invalidate the session by setting expired_at to a past time point
  await MyGlobal.prisma.economic_forum_user_sessions.update({
    where: {
      id: props.user.session_id,
      expired_at: { gt: toISOStringSafe(new Date()) },
      deleted_at: null,
    },
    data: {
      expired_at: toISOStringSafe(new Date(new Date().getTime() - 1000)), // Set to 1 second in the past
    },
  });
}
