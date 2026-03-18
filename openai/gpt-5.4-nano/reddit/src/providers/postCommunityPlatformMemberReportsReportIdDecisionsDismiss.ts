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

export async function postCommunityPlatformMemberReportsReportIdDecisionsDismiss(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        community_id: true,
        deleted_at: true,
      },
    });
  if (report.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: report.community_id,
        moderator_user_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const existingResolution =
    await MyGlobal.prisma.community_platform_report_resolutions.findUnique({
      where: { community_platform_report_id: report.id },
      select: { resolution_decision: true },
    });
  if (existingResolution !== null) {
    if (existingResolution.resolution_decision === "dismissed") {
      return;
    }
    throw new HttpException("Conflict", 409);
  }
  const nowIsoTagged = toISOStringSafe(
    new Date().toISOString(),
  ) as unknown as string & tags.Format<"date-time">;
  const resolutionIdTagged = v4() as unknown as string & tags.Format<"uuid">;
  await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.community_platform_report_resolutions.create({
      data: {
        id: resolutionIdTagged,
        community_platform_report_id: report.id,
        moderated_by_user_id: props.member.id as unknown as string &
          tags.Format<"uuid">,
        resolution_decision: "dismissed",
        moderation_note: "",
        resolved_at: nowIsoTagged,
        created_at: nowIsoTagged,
        updated_at: nowIsoTagged,
        deleted_at: null,
      },
      select: { id: true },
    });
    void created;
  });
}
