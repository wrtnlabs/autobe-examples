import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminCancellationRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequest.IUpdate;
}): Promise<IEcommerceMallCancellationRequest> {
  // 1. Fetch the cancellation request to verify it exists and is pending
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          reason: true,
          status: true,
          ecommerce_mall_order_item_id: true,
          ecommerce_mall_customer_id: true,
          ecommerce_mall_seller_id: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  // 2. Validate that the request is in pending status
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cancellation request has already been processed",
      400,
    );
  }
  // 3. Update the cancellation request status and create snapshot in transaction
  const snapshotId = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    // Update the cancellation request status
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
      where: { id: props.requestId },
      data: {
        status: props.body.status,
        updated_at: now,
      },
    }),
    // Create audit snapshot for dispute resolution
    MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.create({
      data: {
        id: snapshotId,
        ecommerce_mall_cancellation_request_id: props.requestId,
        reason: cancellationRequest.reason,
        status: props.body.status,
        created_at: now,
      },
    }),
  ]);
  // 4. Fetch the updated cancellation request with all nested relations
  const updatedRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EcommerceMallCancellationRequestTransformer.select(),
      },
    );
  // 5. Transform to DTO and return
  return EcommerceMallCancellationRequestTransformer.transform(updatedRequest);
}
