import { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformReportCategoryTransformer } from "../transformers/CommunityPlatformReportCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformReportCategoriesId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportCategory> {
  const category =
    await MyGlobal.prisma.community_platform_report_categories.findUnique({
      where: { id: props.id },
      ...CommunityPlatformReportCategoryTransformer.select(),
    });
  if (!category) {
    throw new HttpException("Report category not found", 404);
  }
  return await CommunityPlatformReportCategoryTransformer.transform(category);
}
