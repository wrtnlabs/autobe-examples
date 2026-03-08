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
  await MyGlobal.prisma.discussion_board_tags.findUniqueOrThrow({
    where: { id: props.tagId },
    select: { id: true, deleted_at: true },
  });
  // Validate at least one field is provided
  if (props.body.name === undefined && props.body.description === undefined) {
    throw new HttpException(
      "At least one field (name or description) must be provided",
      400,
    );
  }
  // Check name uniqueness if name is being updated to a different value
  if (props.body.name !== undefined) {
    const existing = await MyGlobal.prisma.discussion_board_tags.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
        id: { not: props.tagId },
      },
    });
    if (existing !== null) {
      throw new HttpException("Tag name already exists", 409);
    }
  }
  // Update the tag (Prisma @updatedAt will auto-update updated_at)
  await MyGlobal.prisma.discussion_board_tags.update({
    where: { id: props.tagId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
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
