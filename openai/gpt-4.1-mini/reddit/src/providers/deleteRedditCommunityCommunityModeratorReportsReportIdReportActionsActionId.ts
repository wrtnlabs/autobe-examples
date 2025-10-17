import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function deleteRedditCommunityCommunityModeratorReportsReportIdReportActionsActionId(props: {
  communityModerator: CommunitymoderatorPayload;
  reportId: string & tags.Format<"uuid">;
  actionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { communityModerator, reportId, actionId } = props;

  const reportAction =
    await MyGlobal.prisma.reddit_community_report_actions.findFirst({
      where: {
        id: actionId,
        report_id: reportId,
        moderator_member_id: communityModerator.id,
      },
    });

  if (!reportAction) {
    throw new HttpException("Report action not found", 404);
  }

  await MyGlobal.prisma.reddit_community_report_actions.delete({
    where: { id: actionId },
  });
}
