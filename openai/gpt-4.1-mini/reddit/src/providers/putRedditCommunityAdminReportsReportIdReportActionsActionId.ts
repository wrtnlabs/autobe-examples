import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminReportsReportIdReportActionsActionId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  actionId: string & tags.Format<"uuid">;
  body: IRedditCommunityReportAction.IUpdate;
}): Promise<IRedditCommunityReportAction> {
  const { admin, reportId, actionId, body } = props;

  // Verify that the report action exists and is not deleted
  await MyGlobal.prisma.reddit_community_report_actions.findFirstOrThrow({
    where: {
      id: actionId,
      report_id: reportId,
      deleted_at: null,
    },
  });

  // Update the report action
  const updated = await MyGlobal.prisma.reddit_community_report_actions.update({
    where: { id: actionId },
    data: {
      action_type: body.action_type,
      notes: body.notes ?? null,
      admin_member_id:
        body.admin_member_id === undefined ? null : body.admin_member_id,
      created_at: body.created_at,
      updated_at: body.updated_at,
      deleted_at: body.deleted_at ?? null,
    },
  });

  return {
    id: updated.id,
    report_id: updated.report_id,
    moderator_member_id: updated.moderator_member_id,
    admin_member_id: updated.admin_member_id ?? null,
    action_type: updated.action_type,
    notes: updated.notes ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
