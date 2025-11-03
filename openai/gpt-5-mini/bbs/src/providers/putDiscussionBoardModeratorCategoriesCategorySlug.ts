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

export async function putDiscussionBoardModeratorCategoriesCategorySlug(props: {
  moderator: ModeratorPayload;
  categorySlug: string;
  body: IDiscussionBoardCategory.IUpdate;
}): Promise<IDiscussionBoardCategory> {
  const { moderator, categorySlug, body } = props;

  // Authorization: verify moderator exists and is active
  const moderatorRecord =
    await MyGlobal.prisma.discussion_board_moderator.findUnique({
      where: { id: moderator.id },
    });
  if (!moderatorRecord || moderatorRecord.deleted_at !== null) {
    throw new HttpException(
      "Unauthorized: moderator not found or inactive",
      403,
    );
  }

  // Resolve target by slug and ensure not soft-deleted
  const existing = await MyGlobal.prisma.discussion_board_categories.findUnique(
    {
      where: { slug: categorySlug },
    },
  );
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Business rule: if name is changing, ensure uniqueness across non-deleted categories
  if (body.name !== undefined && body.name !== existing.name) {
    const conflict =
      await MyGlobal.prisma.discussion_board_categories.findFirst({
        where: {
          name: body.name,
          deleted_at: null,
          NOT: { id: existing.id },
        },
      });
    if (conflict) {
      throw new HttpException("Conflict: category name already exists", 409);
    }
  }

  // Use a single timestamp for update and audit to maintain consistency
  const now = toISOStringSafe(new Date());

  // Perform update with inline data object (only include provided fields)
  const updated = await MyGlobal.prisma.discussion_board_categories.update({
    where: { id: existing.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
      ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
      updated_at: now,
    },
  });

  // Record audit entry for moderation traceability
  await MyGlobal.prisma.discussion_board_moderation_audit.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      moderation_action_id: null,
      report_id: null,
      actor_moderator_id: moderator.id,
      event_type: "category.update",
      event_payload: JSON.stringify({
        before: {
          id: existing.id,
          name: existing.name,
          description: existing.description,
          is_active: existing.is_active,
          sort_order: existing.sort_order,
        },
        after: {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          is_active: updated.is_active,
          sort_order: updated.sort_order,
        },
      }),
      occurred_at: now,
    },
  });

  // Map and return API representation with safe ISO strings for dates
  return {
    id: updated.id as string & tags.Format<"uuid">,
    name: updated.name,
    slug: updated.slug,
    description: updated.description,
    is_active: updated.is_active,
    sort_order: updated.sort_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
