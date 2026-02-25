import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { ICommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReportResolution";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityReportResolutionTransformer } from "../transformers/CommunityReportResolutionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMemberReportsReportIdResolution(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityReportResolution> {
  // Fetch the report to verify existence and get community_id
  const report = await MyGlobal.prisma.community_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      community_id: true,
      status: true,
    },
  });
  // Verify the member is a moderator of the report's community
  const moderatorRecord = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: report.community_id,
      member_id: props.member.id,
    },
  });
  if (moderatorRecord === null) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  // Query resolution using transformer
  const resolution =
    await MyGlobal.prisma.community_report_resolutions.findUnique({
      where: { community_report_id: props.reportId },
      ...CommunityReportResolutionTransformer.select(),
    });
  if (resolution === null) {
    throw new HttpException("Resolution not found", 404);
  }
  return await CommunityReportResolutionTransformer.transform(resolution);
}
