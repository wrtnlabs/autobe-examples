import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAdminDashboardId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Check existence before delete to throw 404 if not found
  const exists = await MyGlobal.prisma.shopping_mall_admin_dashboard.findUnique(
    {
      where: { id },
      select: { id: true },
    },
  );

  if (!exists) {
    throw new HttpException("Admin dashboard not found", 404);
  }

  // Perform hard delete
  await MyGlobal.prisma.shopping_mall_admin_dashboard.delete({
    where: { id },
  });
}
