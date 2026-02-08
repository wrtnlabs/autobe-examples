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

export async function getDiscussionBoardTagsTagId(props: {
  tagId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardTag> {
  const tag = await MyGlobal.prisma.discussion_board_tags.findUnique({
    where: { id: props.tagId },
    select: {
      id: true,
      name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!tag) throw new HttpException("Tag not found", 404);
  return {
    id: tag.id,
    name: tag.name,
    created_at: tag.created_at,
    updated_at: tag.updated_at,
    deleted_at: tag.deleted_at,
  };
}
