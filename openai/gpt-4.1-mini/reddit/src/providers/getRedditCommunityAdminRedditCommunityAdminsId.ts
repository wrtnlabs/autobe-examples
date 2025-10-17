import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminRedditCommunityAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityAdmin> {
  const admin = await MyGlobal.prisma.reddit_community_admins.findUnique({
    where: { id: props.id },
    include: { reddit_community_report_actions: true },
  });
  if (!admin) throw new HttpException("Not Found", 404);

  return {
    id: admin.id,
    email: admin.email,
    password_hash: admin.password_hash,
    admin_level: admin.admin_level,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    reddit_community_report_actions: admin.reddit_community_report_actions
      ? admin.reddit_community_report_actions.map((action) => ({
          id: action.id,
          report_id: action.report_id,
          moderator_member_id: action.moderator_member_id,
          admin_member_id: action.admin_member_id ?? null,
          action_type: action.action_type,
          notes: action.notes ?? null,
          created_at: toISOStringSafe(action.created_at),
          updated_at: toISOStringSafe(action.updated_at),
          deleted_at: action.deleted_at
            ? toISOStringSafe(action.deleted_at)
            : null,
        }))
      : undefined,
  };
}
