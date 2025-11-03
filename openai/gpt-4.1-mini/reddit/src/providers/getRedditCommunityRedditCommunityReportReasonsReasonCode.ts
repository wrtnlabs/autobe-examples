import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";

export async function getRedditCommunityRedditCommunityReportReasonsReasonCode(props: {
  reasonCode: string;
}): Promise<IRedditCommunityReportReason> {
  const reportReason =
    await MyGlobal.prisma.reddit_community_report_reasons.findFirstOrThrow({
      where: { reason_code: props.reasonCode },
      select: {
        id: true,
        reason_code: true,
        reason_name: true,
        description: true,
      },
    });

  return {
    id: reportReason.id,
    reason_code: reportReason.reason_code,
    reason_name: reportReason.reason_name,
    description: reportReason.description ?? undefined,
    created_at: toISOStringSafe((reportReason as any).createdAt),
    updated_at: toISOStringSafe((reportReason as any).updatedAt),
  };
}
