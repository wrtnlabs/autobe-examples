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

export async function putRedditCommunityAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IRedditCommunityAdmin.IUpdate;
}): Promise<IRedditCommunityAdmin> {
  const { admin, adminId, body } = props;

  // Verify the existence of the admin to update
  const existingAdmin =
    await MyGlobal.prisma.reddit_community_admin.findUniqueOrThrow({
      where: { id: adminId },
    });

  // Update admin's user_id
  const updatedAdmin = await MyGlobal.prisma.reddit_community_admin.update({
    where: { id: adminId },
    data: {
      user_id: body.user_id,
    },
  });

  return {
    id: updatedAdmin.id,
    user_id: updatedAdmin.user_id,
    created_at: toISOStringSafe(updatedAdmin.created_at),
  };
}
