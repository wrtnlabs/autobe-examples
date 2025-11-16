import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminReturnRequestsReturnRequestId(props: {
  admin: AdminPayload;
  returnRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Ensure the return request exists
  const existing =
    await MyGlobal.prisma.shopping_mall_return_requests.findUnique({
      where: { id: props.returnRequestId },
    });
  if (!existing) {
    throw new HttpException("Return request not found", 404);
  }
  // Step 2: Transactionally delete all potentially related data and the record itself
  await MyGlobal.prisma.$transaction([
    // If there are subsidiary tables referencing return_request_id, delete their records first.
    // (These deleteMany calls can be enabled or removed as dictated by the actual schema.)
    // Example for possible related tables:
    // MyGlobal.prisma.shopping_mall_return_request_status_histories.deleteMany({ where: { return_request_id: props.returnRequestId } }),
    // MyGlobal.prisma.shopping_mall_return_request_audit_logs.deleteMany({ where: { return_request_id: props.returnRequestId } }),
    // MyGlobal.prisma.shopping_mall_shipments.deleteMany({ where: { return_request_id: props.returnRequestId } }),
    // Then delete the core return request record itself:
    MyGlobal.prisma.shopping_mall_return_requests.delete({
      where: { id: props.returnRequestId },
    }),
  ]);
}
