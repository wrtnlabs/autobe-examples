import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorCategories(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardCategory.ICreate;
}): Promise<IDiscussionBoardCategory> {
  const { moderator, body } = props;

  const existingByName =
    await MyGlobal.prisma.discussion_board_categories.findFirst({
      where: { name: body.name },
    });

  if (existingByName) {
    throw new HttpException("Category with this name already exists", 409);
  }

  const slug = body.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const existingBySlug =
    await MyGlobal.prisma.discussion_board_categories.findFirst({
      where: { slug },
    });

  if (existingBySlug) {
    throw new HttpException(
      "Category slug conflict - please use a different name",
      409,
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discussion_board_categories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: body.name,
      description: body.description ?? null,
      slug: slug,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    name: created.name,
    description: created.description ?? undefined,
    slug: created.slug,
    created_at: now,
    updated_at: now,
  };
}
