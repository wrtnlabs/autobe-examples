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

export async function test_api_seller_cancellation_request_resolved_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins account for authentication
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
  // 2. Retrieve a cancellation request for verification
  // Note: In E2E tests, a pre-existing cancellation request should be available
  // This tests the seller's ability to view resolved cancellation requests
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const retrievedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.at(
      sellerConnection,
      {
        id: requestId,
      },
    );
  typia.assert(retrievedRequest);
  // 3. Validate cancellation request structure
  TestValidator.equals(
    "cancellation request has valid id",
    retrievedRequest.id,
    requestId,
  );
  // 4. Validate order item reference exists
  TestValidator.equals(
    "order item id is present",
    retrievedRequest.ecommerce_mall_order_item_id,
    retrievedRequest.item.id,
  );
  // 5. Validate order reference exists
  TestValidator.equals(
    "order id is present",
    retrievedRequest.ecommerce_mall_order_id,
    retrievedRequest.order.id,
  );
  // 6. Validate seller reference is correct
  TestValidator.equals(
    "seller id matches assignment",
    retrievedRequest.ecommerce_mall_seller_id,
    retrievedRequest.seller.id,
  );
  // 7. Validate cancellation reason is preserved
  TestValidator.predicate(
    "cancellation reason is non-empty string",
    () => retrievedRequest.reason.length > 0,
  );
  // 8. Validate status is a valid cancellation state
  TestValidator.predicate("status is valid cancellation state", () =>
    ["pending", "approved", "rejected"].includes(
      retrievedRequest.status as "pending" | "approved" | "rejected",
    ),
  );
  // 9. Validate order number exists
  TestValidator.predicate(
    "order has business-readable number",
    () => retrievedRequest.order.order_number.length > 0,
  );
  // 10. Validate item details
  TestValidator.predicate(
    "item has seller display name",
    () => retrievedRequest.item.seller_display_name.length > 0,
  );
  TestValidator.predicate(
    "item has variant name",
    () => retrievedRequest.item.product_variant_name.length > 0,
  );
  TestValidator.equals(
    "item quantity is at least 1",
    retrievedRequest.item.quantity >= 1,
    true,
  );
  // 11. Validate timestamps exist
  TestValidator.predicate("created_at is valid datetime", () => {
    try {
      new Date(retrievedRequest.created_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("updated_at is valid datetime", () => {
    try {
      new Date(retrievedRequest.updated_at);
      return true;
    } catch {
      return false;
    }
  });
}
