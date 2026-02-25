import { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminReportCategoriesReportCategoryId(props: {
  admin: AdminPayload;
  reportCategoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportCategory> {
  const reportCategory =
    await MyGlobal.prisma.community_platform_report_categories.findUniqueOrThrow(
      {
        where: { id: props.reportCategoryId },
      },
    );
  return {
    name: reportCategory.name,
    display_name: reportCategory.display_name,
    severity_level: typia.assert<
      "low" | "medium" | "high" | "critical" | undefined
    >(reportCategory.severity_level),
    is_active: reportCategory.is_active,
  };
}
