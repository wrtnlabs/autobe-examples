import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

/**
 * Test that an authenticated administrator can retrieve a pending cancellation request by its unique identifier.
 * Validates admin oversight capabilities to access cancellation requests from any customer.
 */
export async function test_api_cancellation_request_retrieve_pending_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Setup: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Setup: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 4. Create cancellation request as customer (this internally creates necessary order structure)
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: "Changed my mind about the purchase",
        },
      },
    );
  typia.assert(cancellationRequest);
  // 5. Retrieve cancellation request as admin
  const retrievedRequest =
    await api.functional.shoppingMall.admin.cancellation_requests.at(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate response structure and values
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "seller is null (pending)",
    retrievedRequest.seller,
    null,
  );
  TestValidator.equals(
    "rejection reason is null",
    retrievedRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "responded at is null",
    retrievedRequest.respondedAt,
    null,
  );
  TestValidator.equals("deleted at is null", retrievedRequest.deletedAt, null);
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "order item status is paid",
    retrievedRequest.orderItem.status,
    "paid",
  );
  TestValidator.equals(
    "customer ID matches",
    retrievedRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedRequest.customer.email,
    customerAuth.email,
  );
  TestValidator.predicate(
    "has requested at timestamp",
    retrievedRequest.requestedAt !== null,
  );
  TestValidator.predicate(
    "has created at timestamp",
    retrievedRequest.createdAt !== null,
  );
  TestValidator.predicate(
    "has updated at timestamp",
    retrievedRequest.updatedAt !== null,
  );
  TestValidator.predicate(
    "order item has quantity",
    retrievedRequest.orderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "order item has price",
    retrievedRequest.orderItem.price >= 0,
  );
}
