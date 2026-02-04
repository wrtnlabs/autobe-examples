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
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";

export async function patchShoppingMallSuperAdminAdminsAdminIdUpgrade(props: {
  superAdmin: SuperadminPayload;
  adminId: string;
}): Promise<IShoppingMallAdmin> {
  // Verify superadmin is authorized
  if (props.superAdmin.type !== "superadmin") {
    throw new HttpException(
      "Unauthorized: Only superadmin can promote administrators",
      403,
    );
  }
  // Find target admin
  const targetAdmin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: props.adminId },
  });
  if (!targetAdmin) {
    throw new HttpException("Admin not found", 404);
  }
  // Validate target is regular admin (not already super)
  // Schema uses snake_case naming convention: admin_type
  if (targetAdmin.admin_type !== "regular") {
    throw new HttpException(
      "Only regular administrators can be promoted to superadmin",
      403,
    );
  }
  // Update admin type to super
  const updatedAdmin = await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: { admin_type: "super" },
  });
  // Return the updated admin object without type assertion
  return updatedAdmin;
}
