import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminRedditCommunityAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.reddit_community_admins.findUnique({
    where: { id: props.id },
  });

  if (existing === null || existing.deleted_at !== null) {
    throw new HttpException("Admin user not found", 404);
  }

  await MyGlobal.prisma.reddit_community_admins.delete({
    where: { id: props.id },
  });
}
