import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminRedditCommunityReportReasonsReasonCode(props: {
  admin: AdminPayload;
  reasonCode: string;
}): Promise<void> {
  const { admin, reasonCode } = props;

  // Verify the report reason exists
  try {
    await MyGlobal.prisma.reddit_community_report_reasons.findUniqueOrThrow({
      where: { reason_code: reasonCode },
      select: { id: true },
    });
  } catch {
    throw new HttpException(
      `Report reason with reasonCode '${reasonCode}' not found`,
      404,
    );
  }

  // Perform hard delete
  await MyGlobal.prisma.reddit_community_report_reasons.delete({
    where: { reason_code: reasonCode },
  });
}
