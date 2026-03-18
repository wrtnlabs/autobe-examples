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

export async function putCommunityPlatformMemberReportsReportIdTargetsTargetId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  targetId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportTarget.IUpdate;
}): Promise<ICommunityPlatformReportTarget> {
  if (props.body.target_type.trim().length === 0) {
    throw new HttpException("target_type must be non-empty", 400);
  }
  if (props.body.target_id.trim().length === 0) {
    throw new HttpException("target_id must be non-empty", 400);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const report = await tx.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        reporter_id: true,
      } satisfies Prisma.community_platform_reportsSelect,
    });
    const communityId = (
      report as unknown as {
        community_id?: string;
      }
    ).community_id;
    const isModerator =
      communityId === undefined
        ? null
        : await tx.community_platform_community_moderators.findFirst({
            where: {
              community_id: communityId,
              deleted_at: null,
            },
            select: {
              moderator_user_id: true,
            },
          });
    const isOwnerOrModerator =
      (
        report as unknown as {
          community_owner_id?: string;
        }
      ).community_owner_id === props.member.id ||
      (isModerator?.moderator_user_id ?? null) === props.member.id;
    if (!isOwnerOrModerator) {
      throw new HttpException("Forbidden", 403);
    }
    const target = await tx.community_platform_report_targets.findUniqueOrThrow(
      {
        where: {
          id: props.targetId,
          community_platform_report_id: props.reportId,
        } as Prisma.community_platform_report_targetsWhereUniqueInput,
        select: {
          id: true,
        },
      },
    );
    await tx.community_platform_report_targets.update({
      where: { id: target.id },
      data: {
        target_type: props.body.target_type,
        target_id: props.body.target_id,
        updated_at: toISOStringSafe(new Date()),
      },
    });
    const updated =
      await tx.community_platform_report_targets.findUniqueOrThrow({
        where: { id: target.id },
        ...CommunityPlatformReportTargetTransformer.select(),
      });
    return await CommunityPlatformReportTargetTransformer.transform(updated);
  });
}
