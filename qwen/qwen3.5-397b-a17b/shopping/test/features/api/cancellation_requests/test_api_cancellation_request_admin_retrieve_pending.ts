import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieval of a pending cancellation request.
 *
 * Validates the admin cancellation request retrieval endpoint by authenticating as an administrator and fetching a specific cancellation request. Ensures that the response contains complete cancellation request data including order item context, customer information, and proper pending state representation.
 *
 * The test verifies that administrators can access cancellation requests for oversight purposes, with all nested objects (orderItem, customer) properly joined and returned. The pending state is confirmed by checking that respondedAt is null, status equals 'pending', and shipment is null (item not yet shipped).
 *
 * 1. Administrator account created via authorize_admin_join utility.
 * 2. Cancellation request retrieved by UUID using admin cancellation_requests.at endpoint.
 * 3. Response validated against IShoppingMallCancellationRequest DTO structure via typia.assert().
 * 4. Pending state verified: status is 'pending', respondedAt is null, shipment is null.
 * 5. Business rules validated: reason is non-empty, deletedAt is null for active request.
 */
export async function test_api_cancellation_request_admin_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve cancellation request by ID
  const cancellationRequest =
    await api.functional.shoppingMall.admin.cancellation_requests.at(
      adminConnection,
      {
        cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(cancellationRequest);
  // 3. Validate pending status (business logic)
  TestValidator.equals(
    "status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 4. Validate respondedAt is null for pending requests (business logic)
  TestValidator.equals(
    "respondedAt is null for pending request",
    cancellationRequest.respondedAt,
    null,
  );
  // 5. Validate shipment is null for pending cancellation (item not yet shipped)
  TestValidator.equals(
    "shipment is null for pending cancellation",
    cancellationRequest.orderItem.shipment,
    null,
  );
  // 6. Validate reason is non-empty (business rule)
  TestValidator.predicate(
    "reason is non-empty string",
    () => cancellationRequest.reason.length > 0,
  );
  // 7. Validate deletedAt is null for active request
  TestValidator.equals(
    "deletedAt is null for active request",
    cancellationRequest.deletedAt,
    null,
  );
  // 8. Validate customer profile if exists (nullable field)
  if (cancellationRequest.customer.customerProfile !== null) {
    typia.assertGuard(cancellationRequest.customer.customerProfile!);
    TestValidator.predicate(
      "customer profile has display name",
      () =>
        cancellationRequest.customer.customerProfile!.display_name.length > 0,
    );
  }
  // 9. Validate order item status is paid (not yet shipped)
  TestValidator.equals(
    "order item status is paid",
    cancellationRequest.orderItem.status,
    "paid",
  );
}
