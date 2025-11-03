import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deletePoliticsBbsModeratorCategoriesCategoryCode(props: {
  moderator: ModeratorPayload;
  categoryCode: string;
}): Promise<void> {
  // Step 1: Validate moderator still exists and is authorized
  const moderator = await MyGlobal.prisma.politics_bbs_moderators.findUnique({
    where: {
      id: props.moderator.id,
      deleted_at: null,
    },
  });

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Step 2: Locate the target category - categories have no soft delete
  const category = await MyGlobal.prisma.politics_bbs_categories.findUnique({
    where: {
      code: props.categoryCode,
    },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  // Step 3: Execute hard delete for this category
  // No soft delete for categories as per schema - direct deletion
  await MyGlobal.prisma.politics_bbs_categories.delete({
    where: {
      id: category.id,
    },
  });

  // Step 4: Article references to this category will be automatically
  // handled through cascade deletion relationships
}
