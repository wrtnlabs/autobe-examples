import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardTagTransformer } from "../transformers/DiscussionBoardTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminTagsTagId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardTag.IUpdate;
}): Promise<IDiscussionBoardTag> {
  // Verify tag exists and is not soft-deleted
  const existing =
    await MyGlobal.prisma.discussion_board_tags.findUniqueOrThrow({
      where: { id: props.tagId },
      select: { id: true, name: true, deleted_at: true },
    });
  // Check unique name constraint if name is being updated
  if (props.body.name !== undefined) {
    const trimmedName = props.body.name.trim();
    if (trimmedName === "") {
      throw new HttpException(
        "Tag name cannot be empty or whitespace-only",
        400,
      );
    }
    // Check if another active tag has the same name (excluding current tag)
    const conflictingTag =
      await MyGlobal.prisma.discussion_board_tags.findFirst({
        where: {
          id: { not: props.tagId },
          name: trimmedName,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (conflictingTag !== null) {
      throw new HttpException("Tag name already exists", 409);
    }
  }
  // Perform the update
  await MyGlobal.prisma.discussion_board_tags.update({
    where: { id: props.tagId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name.trim() }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch and transform the updated tag
  const updated = await MyGlobal.prisma.discussion_board_tags.findUniqueOrThrow(
    {
      where: { id: props.tagId },
      ...DiscussionBoardTagTransformer.select(),
    },
  );
  return await DiscussionBoardTagTransformer.transform(updated);
}
