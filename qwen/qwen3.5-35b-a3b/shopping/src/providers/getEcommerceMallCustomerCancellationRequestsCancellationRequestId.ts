import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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

export async function getEcommerceMallCustomerCancellationRequestsCancellationRequestId(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequest> {
  // Query the cancellation request with full data needed for authorization
  // and response transformation
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
          deleted_at: null,
        },
        select: {
          id: true,
          customer_id: true,
          order_item_id: true,
          reason: true,
          request_status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          // For authorization - need to access order item's product and seller
          orderItem: {
            select: {
              product: {
                select: {
                  seller_id: true,
                },
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_cancellation_requestsFindUniqueArgs["select"],
      },
    );
  // Authorization check: Customer who created the request
  if (cancellationRequest.customer_id === props.customer.id) {
    const transformed =
      await EcommerceMallCancellationRequestTransformer.transform(
        await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
          {
            where: { id: props.cancellationRequestId },
            ...EcommerceMallCancellationRequestTransformer.select(),
          },
        ),
      );
    return transformed;
  }
  // Authorization check: Seller responsible for the order item
  // First, get the product's seller ID from the already-fetched data
  const sellerId = cancellationRequest.orderItem.product.seller_id;
  // Check if the authenticated customer is also a seller with access to this order item
  const sellerProfile = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: {
      id: sellerId,
      email: props.customer.id, // Customer email matching seller email
    },
  });
  if (sellerProfile !== null) {
    const transformed =
      await EcommerceMallCancellationRequestTransformer.transform(
        await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
          {
            where: { id: props.cancellationRequestId },
            ...EcommerceMallCancellationRequestTransformer.select(),
          },
        ),
      );
    return transformed;
  }
  // No authorization match
  throw new HttpException("Forbidden", 403);
}
