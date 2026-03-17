import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdminTransformer } from "../transformers/ShoppingMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdminAdminsAdminId(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin> {
  // Fetch the admin record (throws 404 if not found)
  const record = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: props.adminId },
    ...ShoppingMallAdminTransformer.select(),
  });
  // Check if this admin also has a super admin record (same id, joined-table inheritance)
  const superAdminRecord =
    await MyGlobal.prisma.shopping_mall_super_admins.findUnique({
      where: { id: props.adminId },
      select: { id: true, deleted_at: true },
    });
  // Determine grade: 'super' only if a non-soft-deleted super admin record exists
  const grade: "regular" | "super" =
    superAdminRecord !== null && superAdminRecord.deleted_at === null
      ? "super"
      : "regular";
  // Transform the record using the existing transformer
  const admin = await ShoppingMallAdminTransformer.transform(record);
  // Return with the correctly computed grade (overriding transformer's hardcoded 'regular')
  return {
    id: admin.id,
    email: admin.email,
    actor_type: admin.actor_type,
    grade,
    origin: admin.origin,
    created_at: admin.created_at,
    updated_at: admin.updated_at,
    deleted_at: admin.deleted_at,
  } satisfies IShoppingMallAdmin;
}
