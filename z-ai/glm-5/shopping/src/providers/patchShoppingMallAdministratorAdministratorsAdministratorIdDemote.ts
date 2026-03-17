import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorTransformer } from "../transformers/ShoppingMallAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorAdministratorsAdministratorIdDemote(props: {
  administrator: AdministratorPayload;
  administratorId: string;
}): Promise<IShoppingMallAdministrator> {
  // Step 1: Verify requesting admin has super grade
  const requestingAdmin =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: { id: true, grade: true, deleted_at: true },
    });
  if (requestingAdmin.deleted_at !== null) {
    throw new HttpException("Administrator account is deleted", 403);
  }
  if (requestingAdmin.grade !== "super") {
    throw new HttpException(
      "Only super administrators can demote administrators",
      403,
    );
  }
  // Step 2: Retrieve target administrator
  const targetAdmin =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administratorId },
      select: { id: true, grade: true, deleted_at: true },
    });
  // Step 3: Verify target exists and is not deleted
  if (targetAdmin.deleted_at !== null) {
    throw new HttpException("Target administrator account is deleted", 400);
  }
  // Step 4: Verify target is not same as requesting admin (no self-demotion)
  if (targetAdmin.id === props.administrator.id) {
    throw new HttpException("Cannot demote yourself", 400);
  }
  // Step 5: Verify target has 'super' grade
  if (targetAdmin.grade !== "super") {
    throw new HttpException(
      "Target administrator is not a super administrator",
      400,
    );
  }
  // Step 6: Count remaining super admins (excluding target) to ensure >= 1 remains
  const superAdminCount =
    await MyGlobal.prisma.shopping_mall_administrators.count({
      where: {
        grade: "super",
        deleted_at: null,
        id: { not: targetAdmin.id },
      },
    });
  if (superAdminCount < 1) {
    throw new HttpException("Cannot demote the last super administrator", 400);
  }
  // Step 7: Update target's grade to 'regular' and updated_at
  const updated = await MyGlobal.prisma.shopping_mall_administrators.update({
    where: { id: props.administratorId },
    data: {
      grade: "regular",
      updated_at: new Date(),
    },
    ...ShoppingMallAdministratorTransformer.select(),
  });
  // Step 8: Return updated administrator
  return ShoppingMallAdministratorTransformer.transform(updated);
}
