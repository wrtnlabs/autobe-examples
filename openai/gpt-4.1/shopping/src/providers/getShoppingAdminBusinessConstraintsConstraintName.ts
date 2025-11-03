import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingBusinessConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessConstraint";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminBusinessConstraintsConstraintName(props: {
  admin: AdminPayload;
  constraintName: string;
}): Promise<IShoppingBusinessConstraint> {
  const constraint =
    await MyGlobal.prisma.shopping_business_constraints.findFirst({
      where: {
        constraint_name: props.constraintName,
      },
    });
  if (!constraint) {
    throw new HttpException("Business constraint not found", 404);
  }
  return {
    id: constraint.id,
    constraint_name: constraint.constraint_name,
    scope: constraint.scope,
    limit_value: constraint.limit_value,
    unit: constraint.unit,
    description: constraint.description ?? undefined,
    active: constraint.active,
    created_at: toISOStringSafe(constraint.created_at),
    updated_at: toISOStringSafe(constraint.updated_at),
    deleted_at:
      constraint.deleted_at != null
        ? toISOStringSafe(constraint.deleted_at)
        : undefined,
  };
}
