import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformGlobalConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGlobalConstraint";

export async function getCommunityPlatformGlobalConstraintsConstraintKey(props: {
  constraintKey: string;
}): Promise<ICommunityPlatformGlobalConstraint> {
  const record =
    await MyGlobal.prisma.community_platform_global_constraints.findUnique({
      where: { constraint_key: props.constraintKey },
    });

  if (!record) {
    throw new HttpException("Constraint not found", 404);
  }

  return {
    id: record.id,
    constraint_key: record.constraint_key,
    constraint_type: record.constraint_type,
    constraint_value: record.constraint_value,
    description:
      record.description === undefined
        ? undefined
        : record.description === null
          ? null
          : record.description,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === undefined
        ? undefined
        : record.deleted_at === null
          ? null
          : toISOStringSafe(record.deleted_at),
  };
}
