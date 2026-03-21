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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerCancellationRequestsRequestIdReject(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequest.IReject;
}): Promise<IEcommerceMallCancellationRequest> {
  // 1. Find the cancellation request
  const request =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          ecommerce_mall_seller_id: true,
          status: true,
          reason: true,
        },
      },
    );
  // 2. Verify the request belongs to this seller
  if (request.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify status is pending (only pending requests can be rejected)
  if (request.status !== "pending") {
    throw new HttpException("Cancellation request is not pending", 409);
  }
  // 4. Update the cancellation request status to rejected
  const now = new Date();
  await MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
    where: { id: props.requestId },
    data: {
      status: "rejected",
      updated_at: now,
    },
  });
  // 5. Create snapshot of the cancellation request state for audit trail
  const snapshotId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.create({
    data: {
      id: snapshotId,
      ecommerce_mall_cancellation_request_id: props.requestId,
      reason: props.body.reason ?? request.reason,
      status: "rejected",
      created_at: now,
    },
  });
  // 6. Fetch complete request with all relations for response
  const complete =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EcommerceMallCancellationRequestTransformer.select(),
      },
    );
  return await EcommerceMallCancellationRequestTransformer.transform(complete);
}
