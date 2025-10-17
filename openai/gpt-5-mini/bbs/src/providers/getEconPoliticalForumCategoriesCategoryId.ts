import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";

export async function getEconPoliticalForumCategoriesCategoryId(props: {
  categoryId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumCategory> {
  const { categoryId } = props;

  const record =
    await MyGlobal.prisma.econ_political_forum_categories.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
        description: true,
        is_moderated: true,
        requires_verification: true,
        order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!record || record.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: record.id as string & tags.Format<"uuid">,
    code: record.code ?? null,
    name: record.name,
    slug: record.slug,
    description: record.description ?? null,
    is_moderated: record.is_moderated,
    requires_verification: record.requires_verification,
    order: Number(record.order),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
