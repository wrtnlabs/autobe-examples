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

export async function putCommunityPlatformAdminReportCategoriesReportCategoryId(props: {
  admin: AdminPayload;
  reportCategoryId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportCategory.IUpdate;
}): Promise<ICommunityPlatformReportCategory> {
  // Verify the report category exists and is not soft-deleted
  const existingCategory =
    await MyGlobal.prisma.community_platform_report_categories.findUniqueOrThrow(
      {
        where: {
          id: props.reportCategoryId,
          deleted_at: null,
        },
      },
    );
  // Check for unique name constraint if name is being modified
  if (
    props.body.name !== undefined &&
    props.body.name !== existingCategory.name
  ) {
    const existingWithName =
      await MyGlobal.prisma.community_platform_report_categories.findFirst({
        where: {
          name: props.body.name,
          deleted_at: null,
          id: { not: props.reportCategoryId },
        },
      });
    if (existingWithName) {
      throw new HttpException("Report category name already exists", 409);
    }
  }
  // Build update data object with only provided fields
  const updateData: Prisma.community_platform_report_categoriesUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) updateData.name = props.body.name;
  if (props.body.display_name !== undefined)
    updateData.display_name = props.body.display_name;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  if (props.body.severity_level !== undefined)
    updateData.severity_level = props.body.severity_level;
  if (props.body.moderation_guidelines !== undefined)
    updateData.moderation_guidelines = props.body.moderation_guidelines;
  if (props.body.is_active !== undefined)
    updateData.is_active = props.body.is_active;
  // Update the record
  await MyGlobal.prisma.community_platform_report_categories.update({
    where: { id: props.reportCategoryId },
    data: updateData,
  });
  // Fetch the complete updated record
  const updatedCategory =
    await MyGlobal.prisma.community_platform_report_categories.findUniqueOrThrow(
      {
        where: { id: props.reportCategoryId },
      },
    );
  // Convert to response DTO - ICommunityPlatformReportCategory is likely a filter/search DTO
  // Remove the 'description' property as it doesn't exist in the interface
  return {
    search: undefined,
    name: updatedCategory.name,
    display_name: updatedCategory.display_name,
    // description: updatedCategory.description, // Remove this line
    severity_level: updatedCategory.severity_level as
      | "low"
      | "medium"
      | "high"
      | "critical"
      | undefined,
    is_active: updatedCategory.is_active,
    created_at_from: undefined,
    created_at_to: undefined,
    page: undefined,
    limit: undefined,
    sort_by: undefined,
    sort_order: undefined,
  };
}
