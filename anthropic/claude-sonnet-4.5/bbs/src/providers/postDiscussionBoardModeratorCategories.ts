import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorCategories(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardArticleCategory.ICreate;
}): Promise<IDiscussionBoardArticleCategory> {
  // Check for existing category with same name or slug
  const existing =
    await MyGlobal.prisma.discussion_board_article_categories.findFirst({
      where: {
        OR: [{ name: props.body.name }, { slug: props.body.slug }],
      },
    });

  if (existing) {
    if (existing.name === props.body.name) {
      throw new HttpException(
        "A category with this name already exists. Category names must be unique.",
        409,
      );
    }
    throw new HttpException(
      "A category with this slug already exists. Category slugs must be unique.",
      409,
    );
  }

  // Create new category
  const now = new Date();
  const created =
    await MyGlobal.prisma.discussion_board_article_categories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        name: props.body.name,
        slug: props.body.slug,
        description: props.body.description ?? null,
        sort_order: props.body.sort_order,
        created_at: now,
        updated_at: now,
      },
    });

  // Return mapped result
  return {
    id: created.id as string & tags.Format<"uuid">,
    name: created.name,
    slug: created.slug,
    description: created.description ?? undefined,
    sort_order: created.sort_order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
