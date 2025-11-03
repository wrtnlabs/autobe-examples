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
  const slug = tagSlug.toLowerCase();

  const tag = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: {
      slug,
      is_active: true,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!tag) throw new HttpException("Not Found", 404);

  return {
    id: tag.id as string & tags.Format<"uuid">,
    name: tag.name,
    slug: tag.slug,
    description: tag.description ?? null,
    is_active: tag.is_active,
    created_at: toISOStringSafe(tag.created_at),
    updated_at: toISOStringSafe(tag.updated_at),
    deleted_at: tag.deleted_at ? toISOStringSafe(tag.deleted_at) : null,
  };
}
