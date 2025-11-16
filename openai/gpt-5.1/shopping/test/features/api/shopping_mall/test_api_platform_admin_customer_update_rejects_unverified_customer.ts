import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

export async function test_api_platform_admin_customer_update_rejects_unverified_customer(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authorized session
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = "Admin1234!";

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminJoinResult = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert(adminJoinResult);

  // 2. Create an unverified customer via self-join (no email verify call)
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword = "Customer1234!";

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerJoinResult = await api.functional.auth.customer.join(
    connection,
    {
      body: customerJoinBody,
    },
  );
  typia.assert(customerJoinResult);

  const targetCustomerId = customerJoinResult.id;

  // 3. (Optional) Exercise email verify endpoint in simulate mode only
  //    We do not depend on its business effect as no token issuance flow is wired here.
  if (connection.simulate === true) {
    const verifyBody = {
      token: RandomGenerator.alphaNumeric(32),
    } satisfies IShoppingMallCustomerAuth.IVerifyEmail;

    const verifyResult =
      await api.functional.auth.customer.email.verify.verifyEmail(connection, {
        body: verifyBody,
      });
    typia.assert(verifyResult);
  }

  // 4. Ensure we are authenticated again as platform admin before calling admin APIs
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoginResult = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert(adminLoginResult);

  // 5. Prepare an IShoppingMallCustomer.IUpdate payload to mark the customer as verified
  const updatedName = RandomGenerator.name();
  const updatedStatus = "active";
  const updatedIsVerified = true;

  const updateBody = {
    name: updatedName,
    status: updatedStatus,
    isVerified: updatedIsVerified,
  } satisfies IShoppingMallCustomer.IUpdate;

  const updatedCustomer =
    await api.functional.shoppingMall.platformAdmin.customers.update(
      connection,
      {
        customerId: targetCustomerId,
        body: updateBody,
      },
    );
  typia.assert(updatedCustomer);

  // 6. Validate that the update targeted the correct customer and applied changes
  TestValidator.equals(
    "admin update should target the correct customer id",
    updatedCustomer.id,
    targetCustomerId,
  );

  TestValidator.equals(
    "admin update should apply new customer name",
    updatedCustomer.name,
    updatedName,
  );

  TestValidator.equals(
    "admin update should apply new customer status",
    updatedCustomer.status,
    updatedStatus,
  );

  TestValidator.equals(
    "admin update should apply new customer verification flag",
    updatedCustomer.isVerified,
    updatedIsVerified,
  );
}
