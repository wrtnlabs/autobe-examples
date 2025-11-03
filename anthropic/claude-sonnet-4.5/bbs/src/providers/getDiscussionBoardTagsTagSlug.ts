import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function getDiscussionBoardTagsTagSlug(props: {
  tagSlug: string;
}): Promise<IDiscussionBoardTag> {
  const { tagSlug } = props;

  const tag = await MyGlobal.prisma.discussion_board_tags.findUniqueOrThrow({
    where: { slug: tagSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    created_at: toISOStringSafe(tag.created_at),
    updated_at: toISOStringSafe(tag.updated_at),
  };
}
