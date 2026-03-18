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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport.IInvert> {
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
      },
      select: {
        id: true,
        community_id: true,
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_image_url: true,
            status: true,
            owner: {
              select: {
                id: true,
              },
            },
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
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
  if (report.community.owner.id !== props.member.id) {
    const moderationRole =
      await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
        where: {
          community: {
            id: report.community_id,
          },
          member: {
            id: props.member.id,
          },
        },
        select: {
          id: true,
        },
      });
    if (moderationRole === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return {
    id: report.id,
    community: {
      id: report.community.id,
      name: report.community.name,
      description: report.community.description,
      iconImageUrl: report.community.icon_image_url,
      status: report.community.status,
      owner: {
        id: report.community.owner.id,
      },
      created_at: toISOStringSafe(report.community.created_at),
      updated_at: toISOStringSafe(report.community.updated_at),
      deleted_at:
        report.community.deleted_at !== null
          ? toISOStringSafe(report.community.deleted_at)
          : null,
    },
    member: {
      id: report.member.id,
    },
    targetType: report.target_type,
    targetId: report.target_id,
    reason: report.reason,
    status: report.status,
    reviewedAt:
      report.reviewed_at !== null ? toISOStringSafe(report.reviewed_at) : null,
    createdAt: toISOStringSafe(report.created_at),
    updatedAt: toISOStringSafe(report.updated_at),
    deletedAt:
      report.deleted_at !== null ? toISOStringSafe(report.deleted_at) : null,
  };
}
