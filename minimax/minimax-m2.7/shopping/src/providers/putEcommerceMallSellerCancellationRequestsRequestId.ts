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

export async function putEcommerceMallSellerCancellationRequestsRequestId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequest.IUpdate;
}): Promise<IEcommerceMallCancellationRequest> {
  // 1. Fetch cancellation request by requestId
  const cancellationRequest =
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
  // 2. Verify seller owns this request (authorization)
  if (cancellationRequest.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify current status is 'pending' (only pending requests can be updated)
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cancellation request has already been processed",
      400,
    );
  }
  // 4. Update cancellation request status
  await MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
    where: { id: props.requestId },
    data: {
      status: props.body.status,
      updated_at: new Date(),
    },
  });
  // 5. Create snapshot record for audit trail
  await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_cancellation_request_id: props.requestId,
      reason: cancellationRequest.reason,
      status: props.body.status,
      created_at: new Date(),
    },
  });
  // 6. Fetch full cancellation request with relations for response
  const fullRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EcommerceMallCancellationRequestTransformer.select(),
      },
    );
  // 7. Return transformed response
  return await EcommerceMallCancellationRequestTransformer.transform(
    fullRequest,
  );
}
