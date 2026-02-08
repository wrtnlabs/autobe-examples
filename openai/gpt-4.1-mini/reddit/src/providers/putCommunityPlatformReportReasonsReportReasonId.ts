import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformReportReasonsReportReasonId(props: {
  reportReasonId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportReason.IUpdate;
}): Promise<ICommunityPlatformReportReason> {
  const existing =
    await MyGlobal.prisma.community_platform_report_reasons.findUnique({
      where: { id: props.reportReasonId },
    });
  if (!existing) throw new HttpException("Report reason not found", 404);
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.community_platform_report_reasons.update({
      where: { id: props.reportReasonId },
      data: {
        updated_at: now,
      },
    });
  return {
    id: updated.id,
    reason_text: updated.reason_text,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    deleted_at: updated.deleted_at,
  };
}
