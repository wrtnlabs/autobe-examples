import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminReportCategoriesReportCategoryId(props: {
  admin: AdminPayload;
  reportCategoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find report category
  const category =
    await MyGlobal.prisma.community_platform_report_categories.findUnique({
      where: { id: props.reportCategoryId },
    });
  if (!category) throw new HttpException("Report category not found", 404);

  // 2. Check if any unresolved or in-use moderation workflow/report exists
  const inUseReport =
    await MyGlobal.prisma.community_platform_reports.findFirst({
      where: {
        report_category_id: props.reportCategoryId,
        status: {
          in: ["pending", "under_review", "escalated"],
        },
      },
    });
  if (inUseReport)
    throw new HttpException(
      "Report category cannot be deleted while referenced by active/unresolved reports",
      409,
    );

  // 3. Delete the category
  await MyGlobal.prisma.community_platform_report_categories.delete({
    where: { id: props.reportCategoryId },
  });
}
