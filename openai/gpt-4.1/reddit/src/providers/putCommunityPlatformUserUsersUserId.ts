import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUser.IUpdate;
}): Promise<ICommunityPlatformUser> {
  // Fetch current user, check existence and not soft-deleted
  const existing = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: props.userId },
  });
  if (!existing) {
    throw new HttpException("No such user.", 404);
  }
  if (existing.deleted_at !== null) {
    throw new HttpException("Cannot update a deleted user.", 400);
  }
  // Authorization: only self or admin
  if (props.user.id !== props.userId) {
    throw new HttpException("No permission to update this user.", 403);
  }
  // Only updatable field: display_name
  const updateFields: {
    display_name?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
    ...(typeof props.body.display_name !== "undefined"
      ? { display_name: props.body.display_name }
      : {}),
  };
  const updated = await MyGlobal.prisma.community_platform_users.update({
    where: { id: props.userId },
    data: updateFields,
  });
  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
