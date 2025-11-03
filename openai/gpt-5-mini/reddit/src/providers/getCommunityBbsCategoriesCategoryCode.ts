import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityCategory";
import { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function getCommunityBbsCategoriesCategoryCode(props: {
  categoryCode: string;
}): Promise<ICommunityBbsCommunityCategory> {
  const { categoryCode } = props;

  const record =
    await MyGlobal.prisma.community_bbs_community_categories.findUnique({
      where: { code: categoryCode },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            title: true,
            description: true,
            display_order: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });

  // Not found or soft-deleted entries are not visible to public consumers
  if (!record || record.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: record.id as string & tags.Format<"uuid">,
    code: record.code,
    title: record.title,
    // description is nullable in DB and optional in DTO
    description: record.description ?? null,
    display_order: Number(record.display_order),
    parent: record.parent
      ? {
          id: record.parent.id as string & tags.Format<"uuid">,
          code: record.parent.code,
          title: record.parent.title,
          description: record.parent.description ?? null,
          display_order: Number(record.parent.display_order),
          // Keep parent summary shallow to avoid recursion
          parent: null,
          // created_by is optional in summary; set to null when not provided
          created_by: null,
          created_at: toISOStringSafe(record.parent.created_at),
          updated_at: toISOStringSafe(record.parent.updated_at),
        }
      : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    // deleted_at is optional+nullable in DTO: return undefined for active records
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
