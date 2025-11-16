import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorUsersUserId(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the user
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: props.userId },
  });

  if (!user) {
    throw new HttpException("User not found.", 404);
  }

  // Step 2: If already deleted, still allow idempotent delete (no error)
  // Step 3: Set deleted_at (soft delete) for compliance
  await MyGlobal.prisma.community_platform_users.update({
    where: { id: props.userId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  // Step 4: Optionally, any relationships/policies to purge user data go here (omitted for this function)
  // Step 5: Hard delete cannot be enforced per table, as soft-delete is schema-driven
}
