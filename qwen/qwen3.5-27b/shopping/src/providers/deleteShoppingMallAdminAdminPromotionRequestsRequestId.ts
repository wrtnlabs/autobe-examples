import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdminAdminPromotionRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify super administrator privileges
  const adminRecord =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
      select: {
        grade: true,
      },
    });
  if (adminRecord.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Find the promotion request
  const request =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: {
          id: props.requestId,
        },
        select: {
          id: true,
          deleted_at: true,
        },
      },
    );
  // Check if already deleted
  if (request.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Soft delete the promotion request
  await MyGlobal.prisma.shopping_mall_admin_promotion_requests.update({
    where: {
      id: props.requestId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
