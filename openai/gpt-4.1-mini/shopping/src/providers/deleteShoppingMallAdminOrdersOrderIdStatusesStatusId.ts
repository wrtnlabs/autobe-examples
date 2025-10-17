import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderIdStatusesStatusId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  statusId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, orderId, statusId } = props;
  try {
    await MyGlobal.prisma.shopping_mall_order_statuses.delete({
      where: {
        id: statusId,
        shopping_mall_order_id: orderId,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025" // Not found
    ) {
      throw new HttpException("Order status not found", 404);
    }
    throw error;
  }
}
