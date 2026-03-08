import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  // Fetch report with all needed relations using transformer's select
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
    ...CommunityPlatformReportTransformer.select(),
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Get community owner_id for authorization
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: report.community.id },
      select: { owner_id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Check if member is community owner
  const isOwner = community.owner_id === props.member.id;
  // Check if member is a moderator (active, not soft-deleted)
  let isModerator = false;
  if (!isOwner) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findUnique({
        where: {
          community_id_member_id: {
            community_id: report.community.id,
            member_id: props.member.id,
          },
        },
      });
    isModerator = moderator !== null && moderator.deleted_at === null;
  }
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  return await CommunityPlatformReportTransformer.transform(report);
}
