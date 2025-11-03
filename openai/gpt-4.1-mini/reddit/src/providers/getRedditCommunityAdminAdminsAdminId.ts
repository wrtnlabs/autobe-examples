import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityAdmin> {
  const { admin, adminId } = props;
  const adminRecord =
    await MyGlobal.prisma.reddit_community_admin.findUniqueOrThrow({
      where: { id: adminId },
    });

  return {
    id: adminRecord.id,
    user_id: adminRecord.user_id,
    created_at: toISOStringSafe(adminRecord.created_at),
  };
}
