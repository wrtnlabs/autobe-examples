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

export async function postShoppingAdminBusinessConstraints(props: {
  admin: AdminPayload;
  body: IShoppingBusinessConstraint.ICreate;
}): Promise<IShoppingBusinessConstraint> {
  // Unpack input values
  const { constraint_name, scope, limit_value, unit, description, active } =
    props.body;

  // 1. Enforce unique constraint_name+scope (only if not deleted)
  // Prisma unique constraint is only on (constraint_name, scope), but we only care about live rows (not soft-deleted)
  const existing =
    await MyGlobal.prisma.shopping_business_constraints.findFirst({
      where: { constraint_name, scope, deleted_at: null },
    });
  if (existing) {
    throw new HttpException(
      `Business constraint with constraint_name "${constraint_name}" and scope "${scope}" already exists.`,
      409,
    );
  }

  // 2. Prepare values
  const now = toISOStringSafe(new Date());

  // 3. Create new business constraint
  const created = await MyGlobal.prisma.shopping_business_constraints.create({
    data: {
      id: v4(),
      constraint_name,
      scope,
      limit_value,
      unit,
      description,
      active,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 4. Map return object
  return {
    id: created.id,
    constraint_name: created.constraint_name,
    scope: created.scope,
    limit_value: created.limit_value,
    unit: created.unit,
    description: created.description ?? undefined,
    active: created.active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
