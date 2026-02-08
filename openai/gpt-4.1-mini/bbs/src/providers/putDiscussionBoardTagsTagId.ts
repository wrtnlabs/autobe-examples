import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardTagsTagId(props: {
  tagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardTag.IUpdate;
}): Promise<IDiscussionBoardTag> {
  const tag = await MyGlobal.prisma.discussion_board_tags.findUnique({
    where: { id: props.tagId },
  });
  if (!tag) throw new HttpException("Tag not found", 404);
  const bodyName = (
    props.body as {
      name?: string;
    }
  ).name;
  if (bodyName !== undefined) {
    const existing = await MyGlobal.prisma.discussion_board_tags.findFirst({
      where: { name: bodyName, NOT: { id: props.tagId } },
    });
    if (existing) throw new HttpException("Tag name conflict", 409);
  }
  const updatedAt = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_tags.update({
      where: { id: props.tagId },
      data: {
        name: bodyName,
        updated_at: updatedAt,
      },
    });
    const fetched = await tx.discussion_board_tags.findUnique({
      where: { id: props.tagId },
    });
    if (!fetched) throw new HttpException("Tag not found after update", 404);
    return fetched;
  });
  return {
    id: updated.id,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
