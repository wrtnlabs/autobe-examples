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

export async function deleteCommunityPlatformAdministratorGlobalConstraintsConstraintKey(props: {
  administrator: AdministratorPayload;
  constraintKey: string;
}): Promise<ICommunityPlatformGlobalConstraint> {
  const deleted = await MyGlobal.prisma.community_platform_global_constraints
    .delete({
      where: {
        constraint_key: props.constraintKey,
      },
    })
    .catch((error) => {
      if (error.code === "P2025") {
        // Record not found
        throw new HttpException("Constraint not found", 404);
      }
      throw error;
    });

  return {
    id: deleted.id,
    constraint_key: deleted.constraint_key,
    constraint_type: deleted.constraint_type,
    constraint_value: deleted.constraint_value,
    description:
      deleted.description === null
        ? null
        : deleted.description === undefined
          ? undefined
          : deleted.description,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at:
      deleted.deleted_at === null || typeof deleted.deleted_at === "undefined"
        ? undefined
        : toISOStringSafe(deleted.deleted_at),
  };
}
