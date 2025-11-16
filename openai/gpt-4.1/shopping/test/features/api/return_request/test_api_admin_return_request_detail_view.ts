import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallReturnRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Validate that an authenticated admin can retrieve the full detail, status,
 * associations, and audit trail of a specific return request by UUID using the
 * detail API.
 *
 * BUSINESS CONTEXT: This test simulates a full workflow: (1) a customer is
 * created and joined; (2) the customer submits a valid return request; (3) an
 * admin account is created and authenticated; (4) the admin fetches the return
 * request with the correct UUID; (5) the admin is able to view all business and
 * audit fields; (6) error is returned for a random non-existent ID.
 *
 * STEPS:
 *
 * 1. Register a new customer and join as the customer.
 * 2. As the customer, create a return request using valid data (with random UUIDs
 *    for order and order item).
 * 3. Register admin and authenticate as admin.
 * 4. Retrieve the created return request by its ID as admin and validate that all
 *    fields including associations are populated, and the response matches the
 *    input.
 * 5. Try to retrieve a non-existent return request and expect error.
 * 6. Confirm security: as customer, attempt access to the detail endpoint and
 *    expect error.
 */
export async function test_api_admin_return_request_detail_view(
  connection: api.IConnection,
) {
  // 1. Register new customer & join
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12) + "!A1";
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customerAuth);
  // 2. As the customer, create a return request for a random order/item
  // (We use random UUIDs for order/item because there are no exposed APIs to create them in the current DTOs/functions)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const createReturnBody = {
    order_id: orderId,
    order_item_id: orderItemId,
    reason,
    // all other optional properties omitted
  } satisfies IShoppingMallReturnRequest.ICreate;
  const createdReturn =
    await api.functional.shoppingMall.customer.returnRequests.create(
      connection,
      { body: createReturnBody },
    );
  typia.assert(createdReturn);
  // 3. Register admin and join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "#B2";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  // 4. Authenticate as admin before accessing detail
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 5. Retrieve the return request detail as admin
  const detail = await api.functional.shoppingMall.admin.returnRequests.at(
    connection,
    { returnRequestId: createdReturn.id },
  );
  typia.assert(detail);
  // Check that the returned data matches business expectations
  TestValidator.equals(
    "return request detail id matches",
    detail.id,
    createdReturn.id,
  );
  TestValidator.equals(
    "return request order id matches",
    detail.order.id,
    orderId,
  ); // It is okay if not supported but prefer to check mapping
  TestValidator.equals(
    "actor association exists (requestedByCustomer)",
    detail.requestedByCustomer?.id ?? null,
    customerAuth.id,
  );
  TestValidator.equals("reason is preserved", detail.reason, reason);
  // 6. Attempt detail retrieval with a non-existent (random) ID
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "error on non-existent return request detail",
    async () => {
      await api.functional.shoppingMall.admin.returnRequests.at(connection, {
        returnRequestId: fakeId,
      });
    },
  );
  // 7. Attempt to retrieve as customer (should be forbidden)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/", // dummy values for login context
      referrer: "https://referrer.com/",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  await TestValidator.error(
    "forbidden for customer role to get admin return details",
    async () => {
      await api.functional.shoppingMall.admin.returnRequests.at(connection, {
        returnRequestId: createdReturn.id,
      });
    },
  );
}
