import { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformReportCategoryCollector } from "../collectors/CommunityPlatformReportCategoryCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminReportCategories(props: {
  admin: AdminPayload;
  body: ICommunityPlatformReportCategory.ICreate;
}): Promise<ICommunityPlatformReportCategory> {
  // Check if category name already exists
  const existing =
    await MyGlobal.prisma.community_platform_report_categories.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException("Report category name already exists", 400);
  }
  // Create the report category using the collector
  const created =
    await MyGlobal.prisma.community_platform_report_categories.create({
      data: await CommunityPlatformReportCategoryCollector.collect({
        body: props.body,
      }),
    });
  // Validate severity_level matches expected values
  const validSeverityLevels = ["low", "medium", "high", "critical"] as const;
  if (!validSeverityLevels.includes(created.severity_level as any)) {
    throw new HttpException("Invalid severity level", 400);
  }
  // Construct response object with proper typing
  return {
    name: created.name,
    display_name: created.display_name,
    severity_level: created.severity_level as
      | "low"
      | "medium"
      | "high"
      | "critical",
    is_active: created.is_active,
  } satisfies ICommunityPlatformReportCategory;
}
