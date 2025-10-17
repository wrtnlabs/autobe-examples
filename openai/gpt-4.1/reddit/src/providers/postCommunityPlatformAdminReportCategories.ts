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

export async function postCommunityPlatformAdminReportCategories(props: {
  admin: AdminPayload;
  body: ICommunityPlatformReportCategory.ICreate;
}): Promise<ICommunityPlatformReportCategory> {
  try {
    // Get created/updated times as ISO strings
    const now = toISOStringSafe(new Date());
    // Generate a new UUID for id
    const id = v4();

    // Attempt to create the category
    const created =
      await MyGlobal.prisma.community_platform_report_categories.create({
        data: {
          id: id,
          name: props.body.name,
          allow_free_text: props.body.allow_free_text,
          created_at: now,
          updated_at: now,
        },
        select: {
          id: true,
          name: true,
          allow_free_text: true,
          created_at: true,
          updated_at: true,
        },
      });

    // Return result matching ICommunityPlatformReportCategory
    return {
      id: created.id,
      name: created.name,
      allow_free_text: created.allow_free_text,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (err) {
    // Unique constraint violation: name already exists
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      Array.isArray(err.meta?.target) &&
      err.meta.target.includes("name")
    ) {
      throw new HttpException(
        `A report category with this name already exists.
Please choose a unique category name.`,
        409,
      );
    }
    // Re-throw all other errors
    throw err;
  }
}
