import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
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

export async function postCommunityMemberCommunitiesCommunityIdReportsReportIdDismiss(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityReport> {
  // 1. Verify community exists and is not deleted
  await MyGlobal.prisma.community_communities.findFirstOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 2. Verify report exists and belongs to this community
  const report = await MyGlobal.prisma.community_reports.findFirstOrThrow({
    where: {
      id: props.reportId,
      community_id: props.communityId,
    },
    select: { id: true, status: true },
  });
  // 3. Verify the acting member holds owner or moderator role in this community
  const moderatorRecord = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.member.id,
    },
    select: { id: true },
  });
  if (moderatorRecord === null) {
    throw new HttpException(
      "Forbidden: you are not a moderator of this community",
      403,
    );
  }
  // 4. Confirm report is still pending
  if (report.status !== "pending") {
    throw new HttpException("Conflict: report has already been resolved", 409);
  }
  // 5. Update the report: set status to 'dismissed', record the resolver, refresh updated_at
  await MyGlobal.prisma.community_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      resolver_member_id: props.member.id,
      updated_at: new Date(),
    },
  });
  // 6. Fetch and return the updated report using the transformer
  const updated = await MyGlobal.prisma.community_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    ...CommunityReportTransformer.select(),
  });
  return CommunityReportTransformer.transform(updated);
}
