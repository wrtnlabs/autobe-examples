import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunityReportsReportIdDismiss(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
    select: { id: true },
  });
  if (!report) throw new HttpException("Report not found", 404);
  await MyGlobal.prisma.community_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      updated_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      moderator_id: props.moderator.id,
      action_type: "dismiss",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
