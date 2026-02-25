import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformReportsDecisionTransformer } from "../transformers/CommunityPlatformReportsDecisionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorReportsDecisionsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportsDecision.IUpdate;
}): Promise<ICommunityPlatformReportsDecision> {
  // Fetch existing decision record
  const existingDecision =
    await MyGlobal.prisma.community_platform_reports_decisions.findUniqueOrThrow(
      {
        where: { id: props.id },
      },
    );
  if (existingDecision.deleted_at !== null) {
    throw new HttpException("Report decision not found", 404);
  }
  // Fetch the associated report including the community relation
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: existingDecision.report_id },
      include: { community: { select: { id: true } } },
    });
  if (!report.community || !report.community.id) {
    throw new HttpException("Report's community not found", 404);
  }
  const communityId = report.community.id;
  // Validate moderator permission by checking community access
  const moderatorHasPermission =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        id: props.moderator.id,
        community_id: communityId,
        deleted_at: null,
      },
    });
  if (moderatorHasPermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Prepare update data
  const dataToUpdate: Prisma.community_platform_reports_decisionsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  if ("comment" in props.body) {
    dataToUpdate.comments =
      props.body.comment === undefined ? null : props.body.comment;
  }
  // Update report decision
  const updatedDecision =
    await MyGlobal.prisma.community_platform_reports_decisions.update({
      where: { id: props.id },
      data: dataToUpdate,
      ...CommunityPlatformReportsDecisionTransformer.select(),
    });
  return await CommunityPlatformReportsDecisionTransformer.transform(
    updatedDecision,
  );
}
