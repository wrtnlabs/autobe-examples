import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformGlobalConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGlobalConstraint";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityPlatformAdministratorGlobalConstraintsConstraintKey(props: {
  administrator: AdministratorPayload;
  constraintKey: string;
  body: ICommunityPlatformGlobalConstraint.IUpdate;
}): Promise<ICommunityPlatformGlobalConstraint> {
  const now = toISOStringSafe(new Date());
  // Check for existence (not soft-deleted)
  const existing =
    await MyGlobal.prisma.community_platform_global_constraints.findFirst({
      where: {
        constraint_key: props.constraintKey,
        deleted_at: null,
      },
    });

  if (existing) {
    // Full update (overwrite type, value, description, update timestamp), preserve id & created_at.
    const updated =
      await MyGlobal.prisma.community_platform_global_constraints.update({
        where: { id: existing.id },
        data: {
          constraint_type: props.body.constraint_type,
          constraint_value: props.body.constraint_value,
          description: props.body.description ?? null,
          updated_at: now,
        },
      });
    return {
      id: updated.id,
      constraint_key: updated.constraint_key,
      constraint_type: updated.constraint_type,
      constraint_value: updated.constraint_value,
      description:
        typeof updated.description === "undefined"
          ? undefined
          : updated.description === null
            ? null
            : updated.description,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
    };
  } else {
    // Create new constraint
    const created =
      await MyGlobal.prisma.community_platform_global_constraints.create({
        data: {
          id: v4(),
          constraint_key: props.constraintKey,
          constraint_type: props.body.constraint_type,
          constraint_value: props.body.constraint_value,
          description: props.body.description ?? null,
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
      description:
        typeof created.description === "undefined"
          ? undefined
          : created.description === null
            ? null
            : created.description,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: undefined, // null in DB, so omit from result for optional+nullable field
    };
  }
}
