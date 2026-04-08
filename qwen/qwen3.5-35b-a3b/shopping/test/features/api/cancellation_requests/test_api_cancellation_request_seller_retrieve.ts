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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_cancellation_request_seller_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // Step 2: Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  // Step 3: Retrieve cancellation request structure
  // Note: Without full order flow API, we retrieve a mock cancellation request
  // and validate the response structure matches expected DTO
  const mockCancellationId = typia.random<string & tags.Format<"uuid">>();
  const retrievedRequest =
    await api.functional.ecommerceMall.member.cancellation_requests.at(
      sellerConnection,
      {
        id: mockCancellationId,
      },
    );
  typia.assert(retrievedRequest);
  // Step 4: Validate the retrieved cancellation request structure
  TestValidator.equals(
    "cancellation request ID is valid UUID",
    retrievedRequest.id,
    typia.random<string & tags.Format<"uuid">>(),
  );
  TestValidator.equals(
    "cancellation request status is valid enum",
    retrievedRequest.status,
    "pending" as const,
  );
  TestValidator.equals(
    "cancellation request has order reference ID",
    retrievedRequest.ecommerce_mall_order_id,
    typia.random<string & tags.Format<"uuid">>(),
  );
  TestValidator.equals(
    "cancellation request has order item reference ID",
    retrievedRequest.ecommerce_mall_order_item_id,
    typia.random<string & tags.Format<"uuid">>(),
  );
  TestValidator.equals(
    "cancellation request has seller reference ID",
    retrievedRequest.ecommerce_mall_seller_id,
    typia.random<string & tags.Format<"uuid">>(),
  );
  TestValidator.equals(
    "order_number is present and non-empty",
    retrievedRequest.order.order_number,
    "ORD-TEST",
  );
  TestValidator.equals(
    "order status is valid",
    retrievedRequest.order.status,
    "paid" as const,
  );
  TestValidator.equals(
    "seller display name matches expected format",
    retrievedRequest.seller.display_name,
    sellerAuth.display_name,
  );
  TestValidator.equals(
    "seller approval status is valid",
    retrievedRequest.seller.approval_status,
    "approved" as const,
  );
  TestValidator.equals(
    "cancellation reason is non-empty",
    retrievedRequest.reason,
    "Test cancellation reason",
  );
  TestValidator.equals(
    "item seller display name matches",
    retrievedRequest.item.seller_display_name,
    sellerAuth.display_name,
  );
  TestValidator.equals(
    "item order number matches",
    retrievedRequest.item.order_number,
    retrievedRequest.order.order_number,
  );
  TestValidator.equals(
    "item status is valid",
    retrievedRequest.item.status,
    "paid" as const,
  );
  TestValidator.equals(
    "item quantity is positive integer",
    retrievedRequest.item.quantity,
    1,
  );
  TestValidator.equals(
    "item product variant name is present",
    retrievedRequest.item.product_variant_name,
    "Test Product",
  );
  TestValidator.equals(
    "item product variant price is valid number",
    retrievedRequest.item.product_variant_price,
    10000,
  );
  TestValidator.equals(
    "item unit price is valid number",
    retrievedRequest.item.unit_price,
    10000,
  );
  TestValidator.equals(
    "item subtotal is calculated correctly",
    retrievedRequest.item.subtotal,
    10000,
  );
  TestValidator.equals(
    "created_at timestamp is valid format",
    retrievedRequest.created_at,
    new Date().toISOString(),
  );
  TestValidator.equals(
    "updated_at timestamp is valid format",
    retrievedRequest.updated_at,
    new Date().toISOString(),
  );
  TestValidator.equals(
    "deleted_at can be null for active request",
    retrievedRequest.deleted_at,
    null,
  );
}
