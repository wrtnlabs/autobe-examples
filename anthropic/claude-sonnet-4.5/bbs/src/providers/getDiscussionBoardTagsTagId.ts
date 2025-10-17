import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function getDiscussionBoardTagsTagId(props: {
  tagId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardTag> {
  const { tagId } = props;

  const tag = await MyGlobal.prisma.discussion_board_tags.findUniqueOrThrow({
    where: { id: tagId },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: tag.id as string & tags.Format<"uuid">,
    name: tag.name,
    description: tag.description ?? undefined,
    status: tag.status,
    created_at: toISOStringSafe(tag.created_at),
    updated_at: toISOStringSafe(tag.updated_at),
  };
}
