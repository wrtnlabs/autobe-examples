import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Delete all sessions belonging to the admin first
  await MyGlobal.prisma.reddit_community_admin_sessions.deleteMany({
    where: {
      reddit_community_admin_id: props.adminId,
    },
  });

  // Hard delete the admin record
  await MyGlobal.prisma.reddit_community_admin.delete({
    where: {
      id: props.adminId,
    },
  });
}
