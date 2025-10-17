import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteAuthAdminSessionsAll(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallAdmin.IRevokeAllSessionsResponse> {
  const { admin } = props;

  const now = toISOStringSafe(new Date());

  const updateResult = await MyGlobal.prisma.shopping_mall_sessions.updateMany({
    where: {
      user_type: "admin",
      admin_id: admin.id,
      is_revoked: false,
    },
    data: {
      is_revoked: true,
      revoked_at: now,
    },
  });

  return {
    message:
      "All sessions have been successfully revoked. Please log in again on all devices.",
    sessions_revoked: updateResult.count,
  };
}
