import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

export async function getCommunityPlatformReportCategoriesReportCategoryId(props: {
  reportCategoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportCategory> {
  try {
    const record =
      await MyGlobal.prisma.community_platform_report_categories.findUniqueOrThrow(
        {
          where: { id: props.reportCategoryId },
        },
      );
    return {
      id: record.id,
      name: record.name,
      allow_free_text: record.allow_free_text,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    };
  } catch (err) {
    throw new HttpException("Report category not found", 404);
  }
}
