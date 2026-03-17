import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerCancellationRequestsCancellationRequestIdReject(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequest> {
  // 1. Fetch the cancellation request with authorization data
  const request =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          status: true,
          seller_id: true,
          customer_id: true,
          order_item_id: true,
          reason: true,
          seller_response: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  // 2. Validate authorization - seller must match the cancellation request
  if (request.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate state - only pending requests can be rejected
  if (request.status !== "pending") {
    throw new HttpException(
      "Cancellation request is not in pending status",
      400,
    );
  }
  // 4. Update the cancellation request to rejected status
  await MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
    where: { id: props.cancellationRequestId },
    data: {
      status: "rejected",
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 5. Create snapshot record for audit trail
  const snapshotId = v4() as string & tags.Format<"uuid">;
  const snapshotTimestamp = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.create({
    data: {
      id: snapshotId,
      cancellation_request_id: props.cancellationRequestId,
      actor_type: "seller",
      status_before: "pending",
      status_after: "rejected",
      action: "rejected",
      created_at: snapshotTimestamp,
      updated_at: snapshotTimestamp,
    },
  });
  // 6. Fetch and return the updated request with relations using transformer
  const fullRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        ...EcommerceMallCancellationRequestTransformer.select(),
      },
    );
  return await EcommerceMallCancellationRequestTransformer.transform(
    fullRequest,
  );
}
