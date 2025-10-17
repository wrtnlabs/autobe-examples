import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminLogout(props: {
  admin: AdminPayload;
}): Promise<IRedditLikeAdmin.ILogoutResponse> {
  const { admin } = props;

  // Find the current active session for this admin
  const session = await MyGlobal.prisma.reddit_like_sessions.findFirst({
    where: {
      reddit_like_user_id: admin.id,
      deleted_at: null,
    },
    orderBy: {
      last_activity_at: "desc",
    },
  });

  if (!session) {
    throw new HttpException(
      "No active session found for this administrator",
      404,
    );
  }

  // Prepare timestamp for soft delete
  const now = toISOStringSafe(new Date());

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.reddit_like_sessions.update({
    where: {
      id: session.id,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  return {
    success: true,
    message:
      "Administrator session successfully terminated and tokens invalidated",
  };
}
