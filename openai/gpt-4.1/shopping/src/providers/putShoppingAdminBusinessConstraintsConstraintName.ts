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

export async function putShoppingAdminBusinessConstraintsConstraintName(props: {
  admin: AdminPayload;
  constraintName: string;
  body: IShoppingBusinessConstraint.IUpdate;
}): Promise<IShoppingBusinessConstraint> {
  // 1. Find the existing constraint by current constraintName (active only)
  const existing =
    await MyGlobal.prisma.shopping_business_constraints.findFirst({
      where: {
        constraint_name: props.constraintName,
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new HttpException("Business constraint not found", 404);
  }

  // 2. If name or scope is changing, check if new constraint_name+scope conflicts with another record
  if (
    props.constraintName !== props.body.constraint_name ||
    existing.scope !== props.body.scope
  ) {
    const collision =
      await MyGlobal.prisma.shopping_business_constraints.findFirst({
        where: {
          constraint_name: props.body.constraint_name,
          scope: props.body.scope,
          deleted_at: null,
          NOT: { id: existing.id },
        },
      });
    if (collision) {
      throw new HttpException(
        "Business constraint with same name and scope already exists",
        409,
      );
    }
  }

  // 3. Update the record
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_business_constraints.update({
    where: { id: existing.id },
    data: {
      constraint_name: props.body.constraint_name,
      scope: props.body.scope,
      limit_value: props.body.limit_value,
      unit: props.body.unit,
      description:
        typeof props.body.description === "undefined"
          ? undefined
          : props.body.description,
      active: props.body.active,
      updated_at: now,
    },
  });

  // 4. Return result in API structure, mapping all date fields
  return {
    id: updated.id,
    constraint_name: updated.constraint_name,
    scope: updated.scope,
    limit_value: updated.limit_value,
    unit: updated.unit,
    description:
      typeof updated.description === "undefined"
        ? undefined
        : updated.description,
    active: updated.active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
