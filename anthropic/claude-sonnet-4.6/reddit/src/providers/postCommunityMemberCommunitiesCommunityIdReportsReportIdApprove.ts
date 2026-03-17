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

export async function postCommunityMemberCommunitiesCommunityIdReportsReportIdApprove(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityReport> {
  // Step 1: Verify community exists
  await MyGlobal.prisma.community_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  // Step 2: Verify requesting member is a moderator or owner of the community
  const moderatorRecord = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.member.id,
    },
    select: { id: true },
  });
  if (moderatorRecord === null) {
    throw new HttpException(
      "Forbidden: You are not a moderator of this community",
      403,
    );
  }
  // Step 3: Fetch the report (minimal fields for validation)
  const report = await MyGlobal.prisma.community_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      community_id: true,
      post_id: true,
      comment_id: true,
      status: true,
    },
  });
  // Step 4: Verify report belongs to this community
  if (report.community_id !== props.communityId) {
    throw new HttpException(
      "Not Found: Report does not belong to this community",
      404,
    );
  }
  // Step 5: Enforce one-way terminal status lifecycle
  if (report.status !== "pending") {
    throw new HttpException("Conflict: Report has already been resolved", 409);
  }
  // Step 6: Execute atomically in a transaction.
  // CRITICAL ORDER: We must null out the FK columns on the report BEFORE
  // deleting the post/comment. The community_reports table has onDelete: Cascade
  // on both post and comment relations, so deleting the content first would
  // cascade-delete the report record itself.
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 6a. Update the report: null out content FKs, set approved status and resolver
    await tx.community_reports.update({
      where: { id: props.reportId },
      data: {
        status: "approved",
        resolver_member_id: props.member.id,
        post_id: null,
        comment_id: null,
        updated_at: new Date(),
      },
    });
    // 6b. Permanently delete the reported content (cascade handles children)
    if (report.post_id !== null) {
      await tx.community_posts.delete({
        where: { id: report.post_id },
      });
    } else if (report.comment_id !== null) {
      await tx.community_comments.delete({
        where: { id: report.comment_id },
      });
    }
  });
  // Step 7: Re-fetch the fully resolved report and transform to DTO
  const updated = await MyGlobal.prisma.community_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    ...CommunityReportTransformer.select(),
  });
  return CommunityReportTransformer.transform(updated);
}
