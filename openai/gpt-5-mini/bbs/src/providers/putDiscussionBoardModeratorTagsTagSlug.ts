import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorTagsTagSlug(props: {
  moderator: ModeratorPayload;
  tagSlug: string;
  body: IDiscussionBoardTag.IUpdate;
}): Promise<IDiscussionBoardTag> {
  const { moderator, tagSlug, body } = props;

  // Reject attempts to change immutable slug
  if ("slug" in body) {
    throw new HttpException("Bad Request: 'slug' is immutable", 400);
  }

  // Verify moderator exists and is active
  const moderatorRecord =
    await MyGlobal.prisma.discussion_board_moderator.findUnique({
      where: { id: moderator.id },
      select: { id: true, deleted_at: true },
    });
  if (!moderatorRecord || moderatorRecord.deleted_at !== null) {
    throw new HttpException("Unauthorized: invalid moderator", 403);
  }

  // Find existing tag by slug
  const existing = await MyGlobal.prisma.discussion_board_tags.findUnique({
    where: { slug: tagSlug },
  });
  if (!existing) {
    throw new HttpException("Not Found", 404);
  }

  // If name provided, ensure uniqueness across tags (excluding current)
  if (body.name !== undefined) {
    const conflict = await MyGlobal.prisma.discussion_board_tags.findFirst({
      where: {
        name: body.name,
        NOT: { id: existing.id },
      },
    });
    if (conflict) {
      throw new HttpException("Conflict: tag name already exists", 409);
    }
  }

  const now = toISOStringSafe(new Date());

  try {
    const updated = await MyGlobal.prisma.discussion_board_tags.update({
      where: { slug: tagSlug },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.is_active !== undefined && { is_active: body.is_active }),
        updated_at: now,
      },
    });

    // Record moderation audit entry for traceability
    await MyGlobal.prisma.discussion_board_moderation_audit.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_moderator_id: moderator.id,
        event_type: "moderation.tag.update",
        event_payload: JSON.stringify({
          action_type: "update",
          target_type: "tag",
          target_id: updated.id,
          before: {
            id: existing.id,
            name: existing.name,
            slug: existing.slug,
            description: existing.description,
            is_active: existing.is_active,
            created_at: toISOStringSafe(existing.created_at),
            updated_at: toISOStringSafe(existing.updated_at),
            deleted_at: existing.deleted_at
              ? toISOStringSafe(existing.deleted_at)
              : null,
          },
          after: {
            id: updated.id,
            name: updated.name,
            slug: updated.slug,
            description: updated.description,
            is_active: updated.is_active,
            created_at: toISOStringSafe(updated.created_at),
            updated_at: toISOStringSafe(updated.updated_at),
            deleted_at: updated.deleted_at
              ? toISOStringSafe(updated.deleted_at)
              : null,
          },
          moderator_id: moderator.id,
        }),
        occurred_at: now,
      },
    });

    return {
      id: updated.id as string & tags.Format<"uuid">,
      name: updated.name,
      slug: updated.slug,
      description:
        updated.description === null
          ? null
          : (updated.description ?? undefined),
      is_active: updated.is_active,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Conflict: unique constraint violation", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
