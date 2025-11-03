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

export async function postDiscussionBoardModeratorTags(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardTag.ICreate;
}): Promise<IDiscussionBoardTag> {
  const { moderator, body } = props;

  const moderatorRecord =
    await MyGlobal.prisma.discussion_board_moderator.findUnique({
      where: { id: moderator.id },
    });

  if (!moderatorRecord || moderatorRecord.deleted_at) {
    throw new HttpException("Unauthorized: moderator not found", 403);
  }

  const normalizedSlug = body.slug.toLowerCase();
  const now = toISOStringSafe(new Date());

  try {
    const created = await MyGlobal.prisma.discussion_board_tags.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        name: body.name,
        slug: normalizedSlug,
        description: body.description ?? null,
        is_active: body.is_active ?? true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    await MyGlobal.prisma.discussion_board_moderation_audit.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderation_action_id: null,
        report_id: null,
        actor_moderator_id: moderator.id,
        event_type: "tag.create",
        event_payload: JSON.stringify({
          tag_id: created.id,
          name: created.name,
          slug: created.slug,
          description: created.description,
          is_active: created.is_active,
          created_by: moderator.id,
        }),
        occurred_at: now,
      },
    });

    return {
      id: created.id as string & tags.Format<"uuid">,
      name: created.name,
      slug: created.slug,
      description: created.description ?? null,
      is_active: created.is_active,
      sort_order: null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const targets = (error.meta && (error.meta.target as string[])) || [];
      if (targets.includes("slug"))
        throw new HttpException("Conflict: tag slug already exists", 409);
      if (targets.includes("name"))
        throw new HttpException("Conflict: tag name already exists", 409);
      throw new HttpException("Conflict: Unique constraint violation", 409);
    }

    throw new HttpException("Internal Server Error", 500);
  }
}
