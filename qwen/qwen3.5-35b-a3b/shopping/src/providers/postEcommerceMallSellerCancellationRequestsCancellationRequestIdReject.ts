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
  // Query the cancellation request with all required fields
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
          deleted_at: null,
        },
        ...EcommerceMallCancellationRequestTransformer.select(),
      },
    );
  // Validate status is pending
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cancellation request is not in pending status",
      400,
    );
  }
  // Verify seller owns the order item
  if (cancellationRequest.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Update the cancellation request with rejected status
  await MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
    where: { id: props.cancellationRequestId },
    data: {
      status: "rejected",
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Create snapshot for audit trail
  await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.create({
    data: {
      id: v4(),
      actor_type: "seller",
      status_before: "pending",
      status_after: "rejected",
      action: "rejected",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      cancellationRequest: { connect: { id: props.cancellationRequestId } },
    },
  });
  // Query the updated cancellation request with full transformer selection
  const updatedCancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
          deleted_at: null,
        },
        ...EcommerceMallCancellationRequestTransformer.select(),
      },
    );
  // Transform and return
  return await EcommerceMallCancellationRequestTransformer.transform(
    updatedCancellationRequest,
  );
}
