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

export async function putDiscussionBoardModeratorTagsTagId(props: {
  moderator: ModeratorPayload;
  tagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardTag.IUpdate;
}): Promise<IDiscussionBoardTag> {
  const { moderator, tagId, body } = props;

  // Verify tag exists and is not soft deleted
  const existingTag = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: {
      id: tagId,
      deleted_at: null,
    },
  });

  if (!existingTag) {
    throw new HttpException("Tag not found or has been deleted", 404);
  }

  // Check name uniqueness if name is being updated
  if (body.name !== undefined && body.name !== null) {
    const normalizedName = body.name.toLowerCase();

    // Only check uniqueness if the name is actually changing
    if (normalizedName !== existingTag.name) {
      const duplicateTag =
        await MyGlobal.prisma.discussion_board_tags.findFirst({
          where: {
            name: normalizedName,
            deleted_at: null,
            id: { not: tagId },
          },
        });

      if (duplicateTag) {
        throw new HttpException("A tag with this name already exists", 409);
      }
    }
  }

  // Prepare current timestamp for updated_at
  const now = toISOStringSafe(new Date());

  // Execute update with conditional field inclusion
  const updated = await MyGlobal.prisma.discussion_board_tags.update({
    where: { id: tagId },
    data: {
      // For name: normalize to lowercase if provided, skip if null/undefined
      ...(body.name !== undefined &&
        body.name !== null && {
          name: body.name.toLowerCase(),
        }),
      // For description: nullable field, can accept null or update value
      ...(body.description !== undefined && {
        description: body.description,
      }),
      // For status: required field, skip if null, update if provided
      ...(body.status !== undefined &&
        body.status !== null && {
          status: body.status,
        }),
      // Always update timestamp
      updated_at: now,
    },
  });

  // Return with properly converted DateTime fields
  return {
    id: updated.id as string & tags.Format<"uuid">,
    name: updated.name,
    description: updated.description === null ? undefined : updated.description,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
