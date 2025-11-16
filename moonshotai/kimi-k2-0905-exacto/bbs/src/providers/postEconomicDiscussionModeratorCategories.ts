import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postEconomicDiscussionModeratorCategories(props: {
  moderator: ModeratorPayload;
  body: IEconomicDiscussionCategory.ICreate;
}): Promise<IEconomicDiscussionCategory> {
  // Check for duplicate code
  const existingCode =
    await MyGlobal.prisma.economic_discussion_categories.findFirst({
      where: { code: props.body.code, deleted_at: null },
    });

  if (existingCode) {
    throw new HttpException(
      `Category with code '${props.body.code}' already exists`,
      409,
    );
  }

  const now = new Date();

  const created = await MyGlobal.prisma.economic_discussion_categories.create({
    data: {
      id: v4(),
      code: props.body.code,
      name: props.body.name,
      description: props.body.description ?? null,
      display_order: props.body.display_order satisfies number as number,
      is_active: props.body.is_active,
      article_count: 0,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    code: created.code,
    name: created.name,
    description: created.description satisfies string | null | undefined as
      | string
      | null
      | undefined,
    display_order: created.display_order satisfies number as number,
    is_active: created.is_active,
    article_count: created.article_count satisfies number as number,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
