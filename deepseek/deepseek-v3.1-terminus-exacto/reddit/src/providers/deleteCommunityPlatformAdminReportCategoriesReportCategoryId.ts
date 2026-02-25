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

export async function deleteCommunityPlatformAdminReportCategoriesReportCategoryId(props: {
  admin: AdminPayload;
  reportCategoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    // Verify the report category exists and is not already deleted
    await MyGlobal.prisma.community_platform_report_categories.findUniqueOrThrow(
      {
        where: {
          id: props.reportCategoryId,
          deleted_at: null,
        },
      },
    );
    // Perform soft deletion by setting deleted_at timestamp using ISO string format
    await MyGlobal.prisma.community_platform_report_categories.update({
      where: { id: props.reportCategoryId },
      data: {
        deleted_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException(
        "Report category not found or already deleted",
        404,
      );
    }
    throw error;
  }
}
