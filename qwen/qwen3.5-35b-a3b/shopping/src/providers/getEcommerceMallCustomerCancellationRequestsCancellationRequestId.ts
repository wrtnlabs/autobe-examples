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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCustomerAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCancellationRequestsCancellationRequestId(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequest> {
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
          deleted_at: null,
        },
        select: {
          id: true,
          order_item_id: true,
          customer_id: true,
          seller_id: true,
          status: true,
          reason: true,
          seller_response: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
          customer: EcommerceMallCustomerAtSummaryTransformer.select(),
          seller: EcommerceMallSellerAtSummaryTransformer.select(),
        },
      },
    );
  if (cancellationRequest.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: cancellationRequest.id,
    order_item_id: cancellationRequest.orderItem.id,
    seller_id: cancellationRequest.seller.id,
    status: cancellationRequest.status,
    reason: cancellationRequest.reason,
    seller_response: cancellationRequest.seller_response ?? null,
    created_at: toISOStringSafe(cancellationRequest.created_at),
    updated_at: toISOStringSafe(cancellationRequest.updated_at),
    deleted_at: cancellationRequest.deleted_at?.toISOString() ?? null,
    order_item: await EcommerceMallOrderItemAtSummaryTransformer.transform(
      cancellationRequest.orderItem,
    ),
    customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
      cancellationRequest.customer,
    ),
    seller: await EcommerceMallSellerAtSummaryTransformer.transform(
      cancellationRequest.seller,
    ),
  };
}
