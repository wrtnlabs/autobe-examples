import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_request_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a cancellation request for the seller
  const cancellationRequest: IEcommerceMallCancellationRequest = {
    id: typia.random<string & tags.Format<"uuid">>(),
    ecommerce_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    ecommerce_mall_order_item_id: typia.random<string & tags.Format<"uuid">>(),
    ecommerce_mall_seller_id: sellerAuth.id,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    status: "pending",
    item: {
      id: typia.random<string & tags.Format<"uuid">>(),
      order_number: `ORD-${RandomGenerator.alphaNumeric(8)}`,
      seller_display_name: sellerAuth.display_name,
      product_variant_name: RandomGenerator.name(2),
      product_variant_sku_code: RandomGenerator.alphaNumeric(8),
      product_variant_price: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000>
      >(),
      quantity: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
      >(),
      unit_price: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000>
      >(),
      subtotal: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000>
      >(),
      status: "paid",
      created_at: new Date().toISOString(),
    } satisfies IEcommerceMallOrderItem.ISummary,
    order: {
      id: typia.random<string & tags.Format<"uuid">>(),
      order_number: `ORD-${RandomGenerator.alphaNumeric(8)}`,
      status: "paid",
      total_price: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000>
      >(),
      created_at: new Date().toISOString(),
      items_count: 1,
      customer: {
        id: typia.random<string & tags.Format<"uuid">>(),
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        phone_number: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      } satisfies IEcommerceMallMember.ISummary,
      shipping_address: {
        id: typia.random<string & tags.Format<"uuid">>(),
        recipient_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        street: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(1),
        state: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "US",
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IEcommerceMallCustomerAddress.ISummary,
      updated_at: new Date().toISOString(),
      deleted_at: null,
    } satisfies IEcommerceMallOrder.ISummary,
    seller: {
      id: sellerAuth.id,
      display_name: sellerAuth.display_name,
      approval_status: sellerAuth.approval_status,
      is_suspended: false,
      created_at: sellerAuth.created_at,
      email: sellerAuth.email,
      rejection_reason: null,
      deleted_at: null,
      updated_at: sellerAuth.updated_at,
    } satisfies IEcommerceMallSeller.ISummary,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  // 3. Seller retrieves the cancellation request
  const retrievedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.at(
      sellerConnection,
      {
        id: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 4. Validate response structure and data
  TestValidator.equals(
    "cancellation request ID",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "cancellation request status",
    retrievedRequest.status,
    cancellationRequest.status,
  );
  TestValidator.equals(
    "cancellation request reason",
    retrievedRequest.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "order item ID",
    retrievedRequest.item.id,
    cancellationRequest.item.id,
  );
  TestValidator.equals(
    "order item order number",
    retrievedRequest.item.order_number,
    cancellationRequest.item.order_number,
  );
  TestValidator.equals(
    "order item seller display name",
    retrievedRequest.item.seller_display_name,
    cancellationRequest.item.seller_display_name,
  );
  TestValidator.equals(
    "order item product variant name",
    retrievedRequest.item.product_variant_name,
    cancellationRequest.item.product_variant_name,
  );
  TestValidator.equals(
    "order item quantity",
    retrievedRequest.item.quantity,
    cancellationRequest.item.quantity,
  );
  TestValidator.equals(
    "order item unit price",
    retrievedRequest.item.unit_price,
    cancellationRequest.item.unit_price,
  );
  TestValidator.equals(
    "order item subtotal",
    retrievedRequest.item.subtotal,
    cancellationRequest.item.subtotal,
  );
  TestValidator.equals(
    "order item status",
    retrievedRequest.item.status,
    cancellationRequest.item.status,
  );
  TestValidator.equals(
    "order ID",
    retrievedRequest.order.id,
    cancellationRequest.order.id,
  );
  TestValidator.equals(
    "order order number",
    retrievedRequest.order.order_number,
    cancellationRequest.order.order_number,
  );
  TestValidator.equals(
    "order status",
    retrievedRequest.order.status,
    cancellationRequest.order.status,
  );
  TestValidator.equals(
    "order total price",
    retrievedRequest.order.total_price,
    cancellationRequest.order.total_price,
  );
  TestValidator.equals(
    "order items count",
    retrievedRequest.order.items_count,
    cancellationRequest.order.items_count,
  );
  TestValidator.equals(
    "seller ID",
    retrievedRequest.seller.id,
    cancellationRequest.seller.id,
  );
  TestValidator.equals(
    "seller display name",
    retrievedRequest.seller.display_name,
    cancellationRequest.seller.display_name,
  );
  TestValidator.equals(
    "seller approval status",
    retrievedRequest.seller.approval_status,
    cancellationRequest.seller.approval_status,
  );
  TestValidator.equals(
    "seller is suspended",
    retrievedRequest.seller.is_suspended,
    cancellationRequest.seller.is_suspended,
  );
  TestValidator.equals(
    "created at",
    retrievedRequest.created_at,
    cancellationRequest.created_at,
  );
  TestValidator.equals(
    "updated at",
    retrievedRequest.updated_at,
    cancellationRequest.updated_at,
  );
  TestValidator.equals(
    "deleted at",
    retrievedRequest.deleted_at,
    cancellationRequest.deleted_at,
  );
  // 5. Verify business rules
  TestValidator.predicate(
    "order item status is paid",
    retrievedRequest.item.status === "paid",
  );
  TestValidator.predicate(
    "cancellation request is not deleted",
    retrievedRequest.deleted_at === null,
  );
}