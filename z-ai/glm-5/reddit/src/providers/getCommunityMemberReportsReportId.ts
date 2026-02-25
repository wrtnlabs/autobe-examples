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
import { CommunityReportTransformer } from "../transformers/CommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string;
}): Promise<ICommunityReport> {
  const report = await MyGlobal.prisma.community_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    ...CommunityReportTransformer.select(),
  });
  const moderator = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: report.community.id,
      member_id: props.member.id,
    },
  });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  return CommunityReportTransformer.transform(report);
}
