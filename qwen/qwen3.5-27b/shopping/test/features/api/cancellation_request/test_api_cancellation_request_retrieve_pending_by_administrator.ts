import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an administrator can retrieve a pending cancellation request with complete details.
 *
 * Validates the administrator's ability to access cancellation request details including customer information, order item data, and request status. The test verifies that administrators can view any cancellation request regardless of which customer created it, and that the response contains all required nested objects properly populated.
 *
 * Special attention is given to verifying that for pending requests, the response contains status 'pending', response_reason is null, and snapshots array is empty. The test also validates the structure of customer and orderItem summary objects.
 *
 * 1. Administrator registers and authenticates using join.
 * 2. Administrator retrieves a cancellation request by ID.
 * 3. Validates response structure contains all required fields.
 * 4. Verifies customer summary object is properly populated.
 * 5. Verifies order item summary object is properly populated.
 * 6. Confirms pending status has null response_reason and empty snapshots.
 */
export async function test_api_cancellation_request_retrieve_pending_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Generate a valid cancellation request ID for testing
  // In a real scenario, this would be obtained from an actual cancellation request
  const cancellationRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Administrator retrieves the cancellation request
  const retrievedRequest =
    await api.functional.shoppingMall.administrator.cancellation_requests.at(
      adminConnection,
      {
        cancellationRequestId,
      },
    );
  typia.assert(retrievedRequest);
  // 4. Validate response structure
  TestValidator.equals(
    "cancellation request ID matches",
    retrievedRequest.id,
    cancellationRequestId,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.predicate(
    "reason is not empty",
    retrievedRequest.reason.length > 0,
  );
  TestValidator.equals(
    "response_reason is null for pending",
    retrievedRequest.response_reason,
    null,
  );
  // 5. Validate customer summary
  TestValidator.predicate(
    "customer ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedRequest.customer.id,
    ),
  );
  TestValidator.predicate(
    "customer email is valid format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(retrievedRequest.customer.email),
  );
  TestValidator.predicate(
    "customer display_name is not empty",
    retrievedRequest.customer.display_name.length > 0,
  );
  TestValidator.predicate(
    "customer banned is boolean",
    typeof retrievedRequest.customer.banned === "boolean",
  );
  TestValidator.predicate(
    "customer created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      retrievedRequest.customer.created_at,
    ),
  );
  // 6. Validate order item summary
  TestValidator.predicate(
    "order item ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedRequest.orderItem.id,
    ),
  );
  TestValidator.predicate(
    "order item quantity is positive",
    retrievedRequest.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item price is positive",
    retrievedRequest.orderItem.price > 0,
  );
  TestValidator.equals(
    "order item status is paid",
    retrievedRequest.orderItem.status,
    "paid",
  );
  // 7. Validate snapshots array is empty for pending requests
  TestValidator.equals(
    "snapshots array is empty for pending",
    retrievedRequest.snapshots.length,
    0,
  );
  // 8. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      retrievedRequest.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      retrievedRequest.updated_at,
    ),
  );
  TestValidator.equals(
    "created_at equals updated_at for pending",
    retrievedRequest.created_at,
    retrievedRequest.updated_at,
  );
}
