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

export async function postDiscussionBoardModeratorCategories(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardCategory.ICreate;
}): Promise<IDiscussionBoardCategory> {
  const { moderator, body } = props;

  try {
    // Authorization: ensure moderator exists and is active (not soft-deleted)
    const moderatorRecord =
      await MyGlobal.prisma.discussion_board_moderator.findFirst({
        where: { id: moderator.id, deleted_at: null },
      });

    if (!moderatorRecord) {
      throw new HttpException(
        "Unauthorized: moderator not found or inactive",
        403,
      );
    }

    // Uniqueness check: do not allow duplicate name or slug among non-deleted categories
    const conflict =
      await MyGlobal.prisma.discussion_board_categories.findFirst({
        where: {
          deleted_at: null,
          OR: [{ name: body.name }, { slug: body.slug }],
        },
      });

    if (conflict) {
      if (conflict.name === body.name) {
        throw new HttpException("Conflict: category name already exists", 409);
      }
      if (conflict.slug === body.slug) {
        throw new HttpException("Conflict: category slug already exists", 409);
      }
      throw new HttpException("Conflict: category already exists", 409);
    }

    // Prepare timestamp once and reuse
    const now = toISOStringSafe(new Date());

    // Create the category record (id must be provided because schema has no default)
    const created = await MyGlobal.prisma.discussion_board_categories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        name: body.name,
        slug: body.slug,
        description: body.description ?? null,
        is_active: body.is_active ?? true,
        sort_order: body.sort_order ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    // Record an audit entry for category creation
    await MyGlobal.prisma.discussion_board_moderation_audit.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_moderator_id: moderator.id,
        event_type: "category.create",
        event_payload: JSON.stringify({
          id: created.id,
          name: created.name,
          slug: created.slug,
        }),
        occurred_at: now,
      },
    });

    // Return canonical DTO, converting Date values to ISO strings
    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      description: created.description ?? null,
      is_active: created.is_active,
      sort_order: created.sort_order ?? null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
