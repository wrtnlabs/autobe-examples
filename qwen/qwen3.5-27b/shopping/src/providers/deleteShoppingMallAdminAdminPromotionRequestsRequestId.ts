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
  // Verify the requesting admin is a super administrator
  const adminRecord =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { grade: true, deleted_at: true, status: true },
    });
  if (adminRecord.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  if (adminRecord.deleted_at !== null || adminRecord.status !== "active") {
    throw new HttpException("Forbidden", 403);
  }
  // Find the promotion request and verify it exists and is not already deleted
  const request =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: { deleted_at: true },
      },
    );
  if (request.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Soft delete the promotion request by setting deleted_at timestamp
  await MyGlobal.prisma.shopping_mall_admin_promotion_requests.update({
    where: { id: props.requestId },
    data: { deleted_at: new Date() },
  });
}
