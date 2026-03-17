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

export async function putCommunityMemberCommunitiesCommunityIdReportsReportId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityReport.IUpdate;
}): Promise<ICommunityReport> {
  // Step 1: Verify community exists and is not soft-deleted
  await MyGlobal.prisma.community_communities.findFirstOrThrow({
    where: { id: props.communityId, deleted_at: null },
    select: { id: true },
  });
  // Step 2: Verify requesting member holds owner or moderator role in this community
  const moderatorRecord = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.member.id,
    },
    select: { id: true },
  });
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Fetch the report scoped to this community (prevents cross-community access)
  const existing = await MyGlobal.prisma.community_reports.findFirstOrThrow({
    where: { id: props.reportId, community_id: props.communityId },
    select: { id: true, status: true, post_id: true, comment_id: true },
  });
  // Step 4: Reject if report is already resolved (409 Conflict)
  if (existing.status !== "pending") {
    throw new HttpException("Conflict: report has already been resolved", 409);
  }
  // Step 5: Execute transaction — update report and optionally soft-delete content
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_reports.update({
      where: { id: props.reportId },
      data: {
        status: props.body.status,
        resolver: { connect: { id: props.member.id } },
        updated_at: new Date(),
      },
    });
    if (props.body.status === "approved") {
      if (existing.post_id !== null) {
        await tx.community_posts.update({
          where: { id: existing.post_id },
          data: { deleted_at: new Date() },
        });
      }
      if (existing.comment_id !== null) {
        await tx.community_comments.update({
          where: { id: existing.comment_id },
          data: { deleted_at: new Date() },
        });
      }
    }
  });
  // Step 6: Re-fetch the updated report and transform to response DTO
  const updated = await MyGlobal.prisma.community_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    ...CommunityReportTransformer.select(),
  });
  return CommunityReportTransformer.transform(updated);
}
