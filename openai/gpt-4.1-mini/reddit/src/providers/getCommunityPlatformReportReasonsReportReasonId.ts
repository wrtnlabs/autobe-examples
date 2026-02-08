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

export async function getCommunityPlatformReportReasonsReportReasonId(props: {
  reportReasonId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportReason> {
  const record =
    await MyGlobal.prisma.community_platform_report_reasons.findUnique({
      where: { id: props.reportReasonId },
      select: {
        id: true,
        reason_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record) throw new HttpException("Report reason not found", 404);
  return {
    id: record.id,
    reason_text: record.reason_text,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
