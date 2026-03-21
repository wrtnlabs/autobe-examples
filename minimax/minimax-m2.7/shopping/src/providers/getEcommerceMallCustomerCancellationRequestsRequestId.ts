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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCancellationRequestsRequestId(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequest> {
  // Fetch the cancellation request with full transformer select and customer_id for auth
  const transformerSelect =
    EcommerceMallCancellationRequestTransformer.select();
  const request =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          ecommerce_mall_customer_id: true,
          ...transformerSelect.select,
        },
      },
    );
  // Authorization: Verify customer owns this request
  if (request.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build the payload with customer_id removed for transformer
  const payload = {
    id: request.id,
    reason: request.reason,
    status: request.status,
    created_at: request.created_at,
    updated_at: request.updated_at,
    orderItem: request.orderItem,
    customer: request.customer,
    seller: request.seller,
    snapshots: request.snapshots,
  };
  return await EcommerceMallCancellationRequestTransformer.transform(payload);
}
