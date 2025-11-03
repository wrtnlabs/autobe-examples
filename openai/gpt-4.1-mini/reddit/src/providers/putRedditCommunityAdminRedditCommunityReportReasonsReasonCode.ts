import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminRedditCommunityReportReasonsReasonCode(props: {
  admin: AdminPayload;
  reasonCode: string;
  body: IRedditCommunityReportReason.IUpdate;
}): Promise<IRedditCommunityReportReason> {
  const { reasonCode, body } = props;

  const updated = await MyGlobal.prisma.reddit_community_report_reasons.update({
    where: { reason_code: reasonCode },
    data: {
      reason_name: body.reason_name ?? undefined,
      description: body.description ?? undefined,
    },
  });

  const castedUpdated = updated as unknown as {
    created_at: Date;
    updated_at: Date;
  };

  return {
    id: updated.id,
    reason_code: updated.reason_code,
    reason_name: updated.reason_name,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(castedUpdated.created_at),
    updated_at: toISOStringSafe(castedUpdated.updated_at),
  };
}
