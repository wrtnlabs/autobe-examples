import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumTag";

export async function getEconPoliticalForumTagsTagId(props: {
  tagId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumTag> {
  const { tagId } = props;

  // Find active (non-deleted) tag by id
  const tag = await MyGlobal.prisma.econ_political_forum_tags.findFirst({
    where: {
      id: tagId,
      deleted_at: null,
    },
  });

  if (!tag) throw new HttpException("Not Found", 404);

  return {
    id: tag.id as string & tags.Format<"uuid">,
    name: tag.name,
    slug: tag.slug,
    description: tag.description ?? null,
    created_at: toISOStringSafe(tag.created_at),
    updated_at: toISOStringSafe(tag.updated_at),
    deleted_at: tag.deleted_at ? toISOStringSafe(tag.deleted_at) : null,
  };
}
