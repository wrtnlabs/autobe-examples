import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_get_customer_detail_not_found_and_access_control(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As authenticated platform admin, call detail endpoint with a random UUID
  //    that does not correspond to any existing customer and expect an error.
  const nonExistingCustomerId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "platform admin sees error for non-existing customerId",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.at(connection, {
        customerId: nonExistingCustomerId,
      });
    },
  );

  // 3. Build an unauthenticated connection by creating a new connection object
  //    with empty headers (do not mutate the original connection headers).
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4. Call the same endpoint without any Authorization header and ensure that
  //    it fails with an HttpError, not a successful customer DTO.
  await TestValidator.error(
    "unauthenticated request to non-existing customer must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.at(unauthConn, {
        customerId: nonExistingCustomerId,
      });
    },
  );

  // 5. Create a real customer via customer join so we have a valid id.
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId = customerAuthorized.id;

  // 6. Re-establish platform admin context because the previous customer join
  //    call overwrote the Authorization header on the shared connection.
  const adminAuthorizedAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedAgain);

  // 7. Using the platform admin context, successfully retrieve the customer
  //    detail by id.
  const customerDetail: IShoppingMallCustomer =
    await api.functional.shoppingMall.platformAdmin.customers.at(connection, {
      customerId,
    });
  typia.assert(customerDetail);

  TestValidator.equals(
    "platform admin customer detail id matches joined customer id",
    customerDetail.id,
    customerId,
  );

  // 8. Attempt to read that same customer detail without Authorization and
  //    verify that it still fails with an HttpError.
  await TestValidator.error(
    "unauthenticated access to existing customer detail must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.at(unauthConn, {
        customerId,
      });
    },
  );
}
