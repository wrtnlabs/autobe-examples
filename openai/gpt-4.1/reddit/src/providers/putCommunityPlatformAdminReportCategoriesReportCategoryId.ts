import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminReportCategoriesReportCategoryId(props: {
  admin: AdminPayload;
  reportCategoryId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportCategory.IUpdate;
}): Promise<ICommunityPlatformReportCategory> {
  const updatedAt = toISOStringSafe(new Date());
  let updated;
  try {
    updated = await MyGlobal.prisma.community_platform_report_categories.update(
      {
        where: { id: props.reportCategoryId },
        data: {
          ...(props.body.name !== undefined && { name: props.body.name }),
          ...(props.body.allow_free_text !== undefined && {
            allow_free_text: props.body.allow_free_text,
          }),
          updated_at: updatedAt,
        },
      },
    );
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Category name must be unique.", 409);
    }
    throw new HttpException("Failed to update report category.", 500);
  }
  return {
    id: updated.id,
    name: updated.name,
    allow_free_text: updated.allow_free_text,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updatedAt,
  };
}
