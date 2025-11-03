import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorCategoriesCategorySlug(props: {
  moderator: ModeratorPayload;
  categorySlug: string;
}): Promise<IDiscussionBoardCategory> {
  const { moderator, categorySlug } = props;

  // Authorization: ensure moderator still exists and is not soft-deleted
  const moderatorRecord =
    await MyGlobal.prisma.discussion_board_moderator.findUnique({
      where: { id: moderator.id },
    });
  if (!moderatorRecord || moderatorRecord.deleted_at) {
    throw new HttpException("Unauthorized: moderator not active", 403);
  }

  // Locate category by unique slug
  const category = await MyGlobal.prisma.discussion_board_categories.findUnique(
    {
      where: { slug: categorySlug },
    },
  );
  if (!category) throw new HttpException("Not Found", 404);

  // If already soft-deleted, return current summary (idempotent)
  if (category.deleted_at) {
    const existing = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? null,
      is_active: category.is_active,
      sort_order: category.sort_order ?? null,
      created_at: toISOStringSafe(category.created_at),
      updated_at: toISOStringSafe(category.updated_at),
      deleted_at: toISOStringSafe(category.deleted_at),
    } satisfies IDiscussionBoardCategory;

    return existing;
  }

  // Perform soft-delete (set timestamp and deactivate)
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_categories.update({
    where: { slug: categorySlug },
    data: {
      deleted_at: now,
      is_active: false,
    },
  });

  // Record audit entry for traceability
  const auditId = v4() satisfies string & tags.Format<"uuid">;
  await MyGlobal.prisma.discussion_board_moderation_audit.create({
    data: {
      id: auditId,
      moderation_action_id: null,
      report_id: null,
      actor_moderator_id: moderator.id,
      event_type: "category.deleted",
      event_payload: JSON.stringify({
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        moderator_id: moderator.id,
      }),
      occurred_at: now,
    },
  });

  const response = {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    description: updated.description ?? null,
    is_active: updated.is_active,
    sort_order: updated.sort_order ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: now,
  } satisfies IDiscussionBoardCategory;

  return response;
}
