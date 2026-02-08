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

export async function deleteCommunityPlatformReportReasonsReportReasonId(props: {
  reportReasonId: string & tags.Format<"uuid">;
}): Promise<void> {
  const deleted =
    await MyGlobal.prisma.community_platform_report_reasons.deleteMany({
      where: { id: props.reportReasonId },
    });
  if (deleted.count === 0) {
    throw new HttpException("Report Reason not found", 404);
  }
}
