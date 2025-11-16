import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformGlobalConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGlobalConstraint";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function postCommunityPlatformAdministratorGlobalConstraints(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformGlobalConstraint.ICreate;
}): Promise<ICommunityPlatformGlobalConstraint> {
  // Ensure constraint_key uniqueness before creation
  const existing =
    await MyGlobal.prisma.community_platform_global_constraints.findFirst({
      where: {
        constraint_key: props.body.constraint_key,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException("A constraint with this key already exists.", 400);
  }

  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_global_constraints.create({
      data: {
        id: v4(),
        constraint_key: props.body.constraint_key,
        constraint_type: props.body.constraint_type,
        constraint_value: props.body.constraint_value,
        description:
          props.body.description === undefined ? null : props.body.description,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    constraint_key: created.constraint_key,
    constraint_type: created.constraint_type,
    constraint_value: created.constraint_value,
    description: created.description ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null || created.deleted_at === undefined
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
