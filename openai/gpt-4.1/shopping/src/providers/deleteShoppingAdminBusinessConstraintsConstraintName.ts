import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminBusinessConstraintsConstraintName(props: {
  admin: AdminPayload;
  constraintName: string;
}): Promise<void> {
  // Step 1: Find the constraint (must not be deleted already)
  const constraint =
    await MyGlobal.prisma.shopping_business_constraints.findFirst({
      where: {
        constraint_name: props.constraintName,
        deleted_at: null,
      },
    });
  if (!constraint) {
    throw new HttpException("Business constraint not found", 404);
  }
  // Step 2: Business rule - protect essential constraints (simulate, e.g., block names starting with 'core_' or 'platform_')
  if (
    /^core_|^platform_/i.test(props.constraintName) ||
    ["max_orders_global", "min_order_value"].includes(props.constraintName)
  ) {
    throw new HttpException(
      "Constraint is essential and cannot be deleted",
      400,
    );
  }
  // Step 3: Soft-delete (set deleted_at)
  await MyGlobal.prisma.shopping_business_constraints.update({
    where: { id: constraint.id },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // All done (void return)
}
