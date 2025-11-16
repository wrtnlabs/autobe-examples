import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  if (props.admin.id === props.adminId) {
    throw new HttpException("Administrators cannot delete themselves.", 403);
  }

  const targetAdmin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: props.adminId },
  });
  if (!targetAdmin) {
    throw new HttpException("Administrator not found.", 404);
  }

  const adminCount = await MyGlobal.prisma.shopping_mall_admins.count();
  if (adminCount <= 1) {
    throw new HttpException(
      "Cannot delete the last remaining administrator.",
      400,
    );
  }

  await MyGlobal.prisma.shopping_mall_admins.delete({
    where: { id: props.adminId },
  });

  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.admin.id,
      action_type: "admin_delete",
      context_info: JSON.stringify({ target_admin_id: props.adminId }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
