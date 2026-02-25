import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminTransformer } from "../transformers/ShoppingMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminAdminsAdminIdDemote(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin> {
  // 1. Authorization Check - Verify requesting admin is super
  const requestingAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { id: true, grade: true },
    });
  if (requestingAdmin.grade !== "super") {
    throw new HttpException(
      "Only super administrators can demote other administrators",
      403,
    );
  }
  // 2. Self-Demotion Prevention
  if (props.adminId === props.admin.id) {
    throw new HttpException("Cannot demote yourself", 400);
  }
  // 3. Target Validation
  const targetAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id: props.adminId },
      select: { id: true, grade: true, deleted_at: true },
    });
  if (targetAdmin.deleted_at !== null) {
    throw new HttpException("Cannot demote a deleted administrator", 400);
  }
  if (targetAdmin.grade !== "super") {
    throw new HttpException(
      "Target administrator is not a super administrator",
      400,
    );
  }
  // 4. Perform Demotion
  const updated = await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: {
      grade: "regular",
      updated_at: new Date(),
    },
    ...ShoppingMallAdminTransformer.select(),
  });
  return await ShoppingMallAdminTransformer.transform(updated);
}
