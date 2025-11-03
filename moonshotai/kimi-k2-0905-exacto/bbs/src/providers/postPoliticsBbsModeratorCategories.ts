import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postPoliticsBbsModeratorCategories(props: {
  moderator: ModeratorPayload;
  body: IPoliticsBbsCategory.ICreate;
}): Promise<IPoliticsBbsCategory> {
  // Generate new category ID
  const categoryId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create the category
  const created = await MyGlobal.prisma.politics_bbs_categories.create({
    data: {
      id: categoryId,
      code: props.body.code,
      name: props.body.name,
      description: props.body.description,
      color: props.body.color ?? null,
      icon: props.body.icon ?? null,
      sequence: props.body.sequence,
      primary: props.body.primary,
      required: props.body.required,
      multiplicative: props.body.multiplicative,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return formatted category
  return {
    id: created.id as string & tags.Format<"uuid">,
    code: created.code,
    name: created.name,
    description: created.description,
    color: created.color,
    icon: created.icon,
    sequence: created.sequence as number & tags.Type<"int32">,
    primary: created.primary,
    required: created.required,
    multiplicative: created.multiplicative,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
