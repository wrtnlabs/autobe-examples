import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putDiscussionBoardAdministratorTagsTagId(props: {
  administrator: AdministratorPayload;
  tagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardTag.IUpdate;
}): Promise<IDiscussionBoardTag> {
  const { administrator, tagId, body } = props;

  // Verify tag exists and is not soft-deleted
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
    const nameConflict = await MyGlobal.prisma.discussion_board_tags.findFirst({
      where: {
        name: body.name.toLowerCase(),
        deleted_at: null,
        id: { not: tagId },
      },
    });

    if (nameConflict) {
      throw new HttpException("Tag name already exists", 409);
    }
  }

  // Update tag with proper field handling
  const updated = await MyGlobal.prisma.discussion_board_tags.update({
    where: { id: tagId },
    data: {
      name:
        body.name !== undefined && body.name !== null
          ? body.name.toLowerCase()
          : undefined,
      description:
        body.description !== undefined ? body.description : undefined,
      status:
        body.status !== undefined && body.status !== null
          ? body.status
          : undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Map to API response type
  return {
    id: updated.id as string & tags.Format<"uuid">,
    name: updated.name,
    description: updated.description === null ? undefined : updated.description,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
