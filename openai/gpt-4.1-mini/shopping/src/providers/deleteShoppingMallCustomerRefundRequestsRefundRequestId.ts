import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallCustomerRefundRequestsRefundRequestId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
    });
    await MyGlobal.prisma.shopping_mall_refund_requests.delete({
      where: { id: props.refundRequestId },
    });
    await MyGlobal.prisma.shopping_mall_administrative_audit_logs.create({
      data: {
        id: v4(),
        administrator: { connect: { id: props.customer.id } },
        action_code: "delete_refund_request",
        target_refund_request_id: props.refundRequestId,
        created_at: new Date().toISOString() satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException("Refund request not found", 404);
    }
    throw error;
  }
}
