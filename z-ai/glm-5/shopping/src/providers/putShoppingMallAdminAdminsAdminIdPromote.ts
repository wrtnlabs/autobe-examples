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

export async function putShoppingMallAdminAdminsAdminIdPromote(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdmin.IPromote;
}): Promise<IShoppingMallAdmin> {
  // 1. Authorization Check - verify admin is super grade
  const promoter = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow(
    {
      where: { id: props.admin.id },
      select: { id: true, grade: true },
    },
  );
  if (promoter.grade !== "super") {
    throw new HttpException(
      "Only super administrators can promote admins",
      403,
    );
  }
  // 2. Self-Promotion Prevention
  if (props.admin.id === props.adminId) {
    throw new HttpException("Cannot promote yourself", 400);
  }
  // 3. Target Validation - check exists and is regular grade
  const targetAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id: props.adminId },
      select: { id: true, grade: true, deleted_at: true },
    });
  if (targetAdmin.deleted_at !== null) {
    throw new HttpException("Administrator not found", 404);
  }
  if (targetAdmin.grade !== "regular") {
    throw new HttpException(
      "Administrator is already a super administrator",
      400,
    );
  }
  // 4. Database Update with Audit Log in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_admins.update({
      where: { id: props.adminId },
      data: {
        grade: "super",
        updated_at: new Date(),
      },
    });
    await tx.shopping_mall_admin_audit_logs.create({
      data: {
        id: v4(),
        shopping_mall_admin_id: props.admin.id,
        action: "admin_promote",
        target_type: "admin",
        target_id: props.adminId,
        details: JSON.stringify({ reason: props.body.reason }),
        ip: "127.0.0.1",
        created_at: new Date(),
      },
    });
  });
  // 5. Return updated admin using transformer
  const updated = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: props.adminId },
    ...ShoppingMallAdminTransformer.select(),
  });
  return await ShoppingMallAdminTransformer.transform(updated);
}
