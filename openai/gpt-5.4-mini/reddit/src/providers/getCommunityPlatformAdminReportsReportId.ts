import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
      },
      select: {
        id: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        member: {
          select: {
            id: true,
          },
        },
        target_type: true,
        target_id: true,
        reason: true,
        status: true,
        reviewed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: report.id,
    community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
      report.community,
    ),
    member: {
      id: report.member.id,
    } satisfies ICommunityPlatformMember.ISummary,
    target_type: report.target_type,
    target_id: report.target_id,
    reason: report.reason,
    status: report.status,
    reviewed_at: report.reviewed_at?.toISOString() ?? null,
    created_at: report.created_at.toISOString(),
    updated_at: report.updated_at.toISOString(),
    deleted_at: report.deleted_at?.toISOString() ?? null,
  };
}
