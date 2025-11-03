import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminUsersUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUser.IUpdate;
}): Promise<ICommunityPlatformUser> {
  // Step 1: Find the user and ensure not soft-deleted
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: props.userId },
  });
  if (!user || user.deleted_at !== null) {
    throw new HttpException("User not found or already deleted", 404);
  }
  // Step 2: Update only display_name and updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_users.update({
    where: { id: props.userId },
    data: {
      ...(props.body.display_name !== undefined
        ? { display_name: props.body.display_name }
        : {}),
      updated_at: now,
    },
  });
  // Step 3: Return the updated user with correctly-typed audit fields
  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
