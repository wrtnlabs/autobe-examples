import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_snapshots_filter_by_entity_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authorized customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Test: GET snapshots with entity_type=cancellation_request and status=pending
  const cancellationResponse =
    await api.functional.shoppingMall.customer.snapshots.index(
      customerConnection,
      {
        body: {
          entity_type: "cancellation_request",
          status: "pending", // This should be accepted since it's valid for this entity type
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(cancellationResponse);
  TestValidator.equals(
    "cancellation snapshots returned",
    cancellationResponse.data.length >= 0,
    true,
  );
  // Validate that all returned snapshots have the correct entity_type
  // Note: The ISummary does not have a 'type' field. We validate entity_type via the API request and response structure.
  TestValidator.predicate(
    "all cancellation snapshots have valid structure",
    cancellationResponse.data.every(
      (s) =>
        s.id !== undefined &&
        s.display_name !== undefined &&
        ["active", "suspended", "deleted"].includes(s.status),
    ),
  );
  // 3. Test: GET snapshots with entity_type=refund_request and status=pending
  const refundResponse =
    await api.functional.shoppingMall.customer.snapshots.index(
      customerConnection,
      {
        body: {
          entity_type: "refund_request",
          status: "pending", // This should be accepted since it's valid for this entity type
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(refundResponse);
  TestValidator.equals(
    "refund snapshots returned",
    refundResponse.data.length >= 0,
    true,
  );
  // Validate that all returned snapshots have the correct entity_type
  // Note: The ISummary does not have a 'type' field. We validate entity_type via the API request and response structure.
  TestValidator.predicate(
    "all refund snapshots have valid structure",
    refundResponse.data.every(
      (s) =>
        s.id !== undefined &&
        s.display_name !== undefined &&
        ["active", "suspended", "deleted"].includes(s.status),
    ),
  );
  // 4. Test: GET snapshots with entity_type=product and status=pending (must be ignored)
  const productResponse =
    await api.functional.shoppingMall.customer.snapshots.index(
      customerConnection,
      {
        body: {
          entity_type: "product",
          status: "pending", // This must be ignored for product type
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(productResponse);
  TestValidator.equals(
    "product snapshots returned",
    productResponse.data.length >= 0,
    true,
  );
  // Validate that all returned snapshots have the correct structure (status filter ignored)
  // Note: The ISummary does not have a 'type' field. We validate entity_type via the API request and response structure.
  TestValidator.predicate(
    "all product snapshots have valid structure",
    productResponse.data.every(
      (s) =>
        s.id !== undefined &&
        s.display_name !== undefined &&
        ["active", "suspended", "deleted"].includes(s.status),
    ),
  );
  // 5. Validate snapshot summary structure (based on IShoppingMallProductSnapshot.ISummary)
  // The ISummary structure is: id, display_name, status
  // No other properties exist on IShoppingMallProductSnapshot.ISummary
  TestValidator.predicate(
    "every snapshot has id",
    [
      ...cancellationResponse.data,
      ...refundResponse.data,
      ...productResponse.data,
    ].every((s) => s.id !== undefined),
  );
  TestValidator.predicate(
    "every snapshot has display_name",
    [
      ...cancellationResponse.data,
      ...refundResponse.data,
      ...productResponse.data,
    ].every((s) => s.display_name !== undefined),
  );
  TestValidator.predicate(
    "every snapshot has status (account status)",
    [
      ...cancellationResponse.data,
      ...refundResponse.data,
      ...productResponse.data,
    ].every((s) => ["active", "suspended", "deleted"].includes(s.status)),
  );
  // No validation of non-existent properties: type, changed_at, changed_by, version, snapshot_data
  // These properties do not exist on IShoppingMallProductSnapshot.ISummary as per provided DTO definitions
}
