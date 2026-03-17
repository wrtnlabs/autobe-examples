import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallSuperAdminTransformer } from "../transformers/ShoppingMallSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdminAdminsAdminIdPromote(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSuperAdmin> {
  // Step 1: Resolve target admin — 404 if not found or soft-deleted
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirstOrThrow({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
    },
  });
  // Step 2: Grade check — if an active super admin with this email already exists, return 409
  const existingSuperAdmin =
    await MyGlobal.prisma.shopping_mall_super_admins.findFirst({
      where: {
        email: admin.email,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingSuperAdmin !== null) {
    throw new HttpException(
      "The target administrator is already a super administrator",
      409,
    );
  }
  // Step 3: Promotion within a transaction
  const newSuperAdminId = v4();
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create the new super admin record
    await tx.shopping_mall_super_admins.create({
      data: {
        id: newSuperAdminId,
        email: admin.email,
        password_hash: admin.password_hash,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // Soft-delete the regular admin record to mark it as promoted
    await tx.shopping_mall_admins.update({
      where: { id: admin.id },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  });
  // Step 4: Return the newly created super admin record via transformer
  const created =
    await MyGlobal.prisma.shopping_mall_super_admins.findUniqueOrThrow({
      where: { id: newSuperAdminId },
      ...ShoppingMallSuperAdminTransformer.select(),
    });
  return ShoppingMallSuperAdminTransformer.transform(created);
}
