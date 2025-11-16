import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallReturnRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Validate that an authenticated customer can update their own return or pickup
 * request details.
 *
 * This scenario covers the ability for a customer, once registered and
 * authenticated, to update an existing return/pickup request using the update
 * API. It tests the positive/happy path, ensuring the update is successful when
 * performed by the correct customer, and that only allowed fields and logical
 * workflows are respected. A prerequisite return request entity is assumed
 * present, focusing the main logic on authenticating the customer and
 * performing a property update (such as reason, status, or
 * scheduled_pickup_at). The result is asserted using strict business rules and
 * audit constraints.
 *
 * Steps:
 *
 * 1. Register a new customer via POST /auth/customer/join and authenticate (get
 *    JWT & id).
 * 2. Generate a synthetic return request (using typia.random for
 *    IShoppingMallReturnRequest) to simulate the prerequisite entity.
 * 3. Prepare a valid update payload (IShoppingMallReturnRequest.IUpdate) with a
 *    new reason, advanced workflow status, and optionally a pickup time.
 * 4. Use api.functional.shoppingMall.customer.returnRequests.update() with the
 *    authenticated customer context and new update data.
 * 5. Assert the output: fields are updated as expected, immutable fields are
 *    preserved, business rules are respected, and audit trail timestamps
 *    advance.
 */
export async function test_api_customer_return_request_update_by_authenticated_customer(
  connection: api.IConnection,
) {
  // 1. Register new customer and obtain authorization
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInput,
    });
  typia.assert(customer);
  // 2. Create a mock return request representing the entity to be updated
  const initialReturnRequest: IShoppingMallReturnRequest =
    typia.random<IShoppingMallReturnRequest>();
  typia.assert(initialReturnRequest);
  // 3. Prepare valid update payload (change reason, update status, change pickup)
  const updateBody = {
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    status: "scheduled",
    scheduled_pickup_at: new Date(Date.now() + 86400000).toISOString(),
  } satisfies IShoppingMallReturnRequest.IUpdate;
  // 4. Invoke update API as the authenticated customer
  const updatedReturnRequest: IShoppingMallReturnRequest =
    await api.functional.shoppingMall.customer.returnRequests.update(
      connection,
      {
        returnRequestId: initialReturnRequest.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReturnRequest);
  // 5. Assert output fields
  TestValidator.equals(
    "updated reason",
    updatedReturnRequest.reason,
    updateBody.reason,
  );
  TestValidator.equals(
    "updated status",
    updatedReturnRequest.status,
    updateBody.status,
  );
  TestValidator.equals(
    "updated scheduled_pickup_at",
    updatedReturnRequest.scheduled_pickup_at,
    updateBody.scheduled_pickup_at,
  );
  TestValidator.equals(
    "order item not changed",
    updatedReturnRequest.orderItem,
    initialReturnRequest.orderItem,
  );
  TestValidator.equals(
    "order not changed",
    updatedReturnRequest.order,
    initialReturnRequest.order,
  );
  TestValidator.equals(
    "request id not changed",
    updatedReturnRequest.id,
    initialReturnRequest.id,
  );
  TestValidator.notEquals(
    "updated timestamp advanced",
    updatedReturnRequest.updated_at,
    initialReturnRequest.updated_at,
  );
}
