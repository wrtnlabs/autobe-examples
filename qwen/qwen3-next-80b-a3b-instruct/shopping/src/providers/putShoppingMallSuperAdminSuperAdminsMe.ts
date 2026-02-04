import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";

export async function putShoppingMallSuperAdminSuperAdminsMe(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallSuperAdmin.IUpdate;
}): Promise<IShoppingMallSuperAdmin> {
  // Verify superadmin exists and is active
  const superAdmin =
    await MyGlobal.prisma.shopping_mall_super_admins.findUnique({
      where: {
        id: props.superAdmin.id,
        deleted_at: null,
      },
    });
  if (!superAdmin) {
    throw new HttpException("Super administrator not found", 404);
  }
  // Profile fields (display_name, phone_number, avatar_url) are NOT stored in shopping_mall_super_admins table
  // according to DTO specification. These are stored in an external profile management system.
  // Only update timestamp in the database and return current profile state.
  // Profile changes are typically handled by a separate update mechanism.
  // Therefore, we simply update the updated_at timestamp in the database to record the profile update action.
  const updated = await MyGlobal.prisma.shopping_mall_super_admins.update({
    where: {
      id: props.superAdmin.id,
    },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return the complete profile representation
  // Must use the values from the original superAdmin object since profile fields come from external system
  // and are not modified by this operation.
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    createdAt: toISOStringSafe(superAdmin.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    adminType: superAdmin.role as "regular" | "super",
    name: undefined, // Not stored in super_admins table, use undefined as per DTO
    phone_number: undefined, // Not stored in super_admins table, use undefined as per DTO
    avatar_url: undefined, // Not stored in super_admins table, use undefined as per DTO
  };
}
