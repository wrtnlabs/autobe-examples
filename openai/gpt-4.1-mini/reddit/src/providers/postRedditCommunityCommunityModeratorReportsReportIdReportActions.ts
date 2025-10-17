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
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function postRedditCommunityCommunityModeratorReportsReportIdReportActions(props: {
  communityModerator: CommunitymoderatorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCommunityReportAction.ICreate;
}): Promise<IRedditCommunityReportAction> {
  const { communityModerator, reportId, body } = props;

  const id = v4();

  const created = await MyGlobal.prisma.reddit_community_report_actions.create({
    data: {
      id,
      report_id: reportId,
      moderator_member_id: communityModerator.id,
      admin_member_id: body.admin_member_id ?? null,
      action_type: body.action_type,
      notes: body.notes ?? null,
      created_at: body.created_at,
      updated_at: body.updated_at,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    report_id: created.report_id,
    moderator_member_id: created.moderator_member_id,
    admin_member_id: created.admin_member_id ?? null,
    action_type: created.action_type,
    notes: created.notes ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
