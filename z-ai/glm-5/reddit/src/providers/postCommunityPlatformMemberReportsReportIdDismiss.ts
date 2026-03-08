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

export async function postCommunityPlatformMemberReportsReportIdDismiss(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        status: true,
        community: {
          select: {
            id: true,
            owner_id: true,
          },
        },
      },
    });
  if (report.status !== "pending") {
    throw new HttpException("Report already resolved", 400);
  }
  const isOwner = report.community.owner_id === props.member.id;
  if (!isOwner) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: report.community.id,
          member_id: props.member.id,
          deleted_at: null,
        },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.community_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updatedReport =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...CommunityPlatformReportTransformer.select(),
    });
  return CommunityPlatformReportTransformer.transform(updatedReport);
}
