import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTarget";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformReportTargetTransformer } from "../transformers/CommunityPlatformReportTargetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberReportsReportIdTargetsTargetId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  targetId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportTarget> {
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: { id: true, community_id: true },
    });
  const allowed =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: report.community_id as any,
        member_id: props.member.id as any,
      } as any,
      select: { id: true },
    });
  if (!allowed) {
    const owner =
      await MyGlobal.prisma.community_platform_communities.findFirst({
        where: {
          id: report.community_id,
          owner_id: props.member.id as any,
          deleted_at: null,
        } as any,
        select: { id: true },
      });
    if (!owner) throw new HttpException("Forbidden", 403);
  }
  const target =
    await MyGlobal.prisma.community_platform_report_targets.findUniqueOrThrow({
      where: {
        id: props.targetId,
        community_platform_report_id: props.reportId,
      },
      ...CommunityPlatformReportTargetTransformer.select(),
    } as any);
  const transformed = await CommunityPlatformReportTargetTransformer.transform(
    target as any,
  );
  return transformed as unknown as ICommunityPlatformReportTarget;
}
