import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityPlatformModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the report by id
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }

  // Step 2: Ensure the status is eligible (resolved or dismissed)
  if (report.status !== "resolved" && report.status !== "dismissed") {
    throw new HttpException(
      "Report can only be deleted if status is resolved or dismissed",
      400,
    );
  }

  // Step 3: Hard delete (permanent)
  await MyGlobal.prisma.community_platform_reports.delete({
    where: { id: props.reportId },
  });
}
