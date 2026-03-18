import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
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
  const report = await MyGlobal.prisma.$transaction(async (tx) => {
    const found = await tx.community_platform_reports.findUnique({
      where: { id: props.reportId },
      ...CommunityPlatformReportTransformer.select(),
    });
    if (found === null || found.deleted_at !== null) {
      return null;
    }
    return found;
  });
  if (report === null) {
    throw new HttpException("Forbidden", 403);
  }
  const communityId = report.community.id;
  const isOwner =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: communityId, community_owner_id: props.member.id },
      select: { id: true },
    });
  if (isOwner === null) {
    const isModerator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: communityId,
          moderator_user_id: props.member.id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (isModerator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return await CommunityPlatformReportTransformer.transform(report);
}
