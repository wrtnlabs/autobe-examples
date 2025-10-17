import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteDiscussionBoardAdministratorTagsTagId(props: {
  administrator: AdministratorPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administrator, tagId } = props;

  // Administrator authentication is already validated by the decorator
  // Find the tag and verify it exists and is not already deleted
  const tag = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: {
      id: tagId,
      deleted_at: null,
    },
  });

  if (!tag) {
    throw new HttpException("Tag not found or already deleted", 404);
  }

  // Check if tag is currently in use (associated with any topics)
  const tagUsageCount = await MyGlobal.prisma.discussion_board_topic_tags.count(
    {
      where: {
        discussion_board_tag_id: tagId,
        deleted_at: null,
      },
    },
  );

  if (tagUsageCount > 0) {
    throw new HttpException(
      "Cannot delete tag that is currently associated with topics. Please remove tag associations first.",
      400,
    );
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_tags.update({
    where: {
      id: tagId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
