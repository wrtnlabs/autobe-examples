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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";

export async function patchShoppingMallSuperAdminAdminsAdminIdDowngrade(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify admin exists
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }
  // Verify superadmin is not downgrading themselves
  if (admin.id === props.superAdmin.id) {
    throw new HttpException("Cannot downgrade self", 403);
  }
  // Update admin status to user
  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
