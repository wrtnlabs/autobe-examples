import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceRefundRequestTransformer } from "../transformers/EcommerceRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorRefundRequestsRefundRequestIdResponses(props: {
  administrator: AdministratorPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequest.IResponse;
}): Promise<IEcommerceRefundRequest> {
  // Verify refund request exists and is active
  const originalRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUniqueOrThrow({
      where: {
        id: props.refundRequestId,
        deleted_at: null,
      },
      select: {
        id: true,
        reason: true,
        requested_at: true,
        refund_window_expires_at: true,
        ecommerce_seller_id: true,
      },
    });
  // Check if refund window has expired - administrators can override
  const currentTime = new Date();
  const expiresAt = new Date(originalRequest.refund_window_expires_at);
  if (currentTime > expiresAt) {
    // Create administrative action for override
    await MyGlobal.prisma.ecommerce_administrative_actions.create({
      data: {
        id: v4(),
        action_type: "refund_window_override",
        administrator_id: props.administrator.id,
        general_description:
          "Administrator responded to expired refund request",
        created_at: currentTime,
        updated_at: currentTime,
      },
    });
  }
  // Create snapshot before modification
  await MyGlobal.prisma.ecommerce_refund_request_snapshots.create({
    data: {
      id: v4(),
      ecommerce_refund_request_id: originalRequest.id,
      modifying_administrator_id: props.administrator.id,
      created_at: currentTime,
      before_state: JSON.stringify({
        reason: originalRequest.reason,
        requested_at: originalRequest.requested_at,
        refund_window_expires_at: originalRequest.refund_window_expires_at,
      }),
      after_state: JSON.stringify({
        reason: props.body.reason,
        requested_at: originalRequest.requested_at,
        refund_window_expires_at: originalRequest.refund_window_expires_at,
      }),
      change_description: "Administrator updated refund request response",
    },
  });
  // Update the refund request
  await MyGlobal.prisma.ecommerce_refund_requests.update({
    where: { id: props.refundRequestId },
    data: {
      reason: props.body.reason,
      updated_at: currentTime,
    },
  });
  // Create administrative action record
  await MyGlobal.prisma.ecommerce_administrative_actions.create({
    data: {
      id: v4(),
      action_type: "refund_request_update",
      administrator_id: props.administrator.id,
      general_description: "Administrator updated refund request response",
      created_at: currentTime,
      updated_at: currentTime,
    },
  });
  // Retrieve and return updated refund request
  const updatedRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...EcommerceRefundRequestTransformer.select(),
    });
  return await EcommerceRefundRequestTransformer.transform(updatedRequest);
}
