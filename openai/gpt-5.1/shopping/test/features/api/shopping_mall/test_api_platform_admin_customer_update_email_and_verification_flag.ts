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

export async function test_api_platform_admin_customer_update_email_and_verification_flag(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and obtain an authorized session
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = "platform-admin-password";

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminJoinOutput = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminJoinOutput);

  // 2. Create a customer account (baseline customer to be updated by admin)
  const originalCustomerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword = "customer-password";

  const customerJoinBody = {
    email: originalCustomerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerJoinOutput = await api.functional.auth.customer.join(
    connection,
    {
      body: customerJoinBody,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoinOutput);

  const customerId = customerJoinOutput.id;
  const customerName = customerJoinOutput.name;
  const originalStatus = customerJoinOutput.status;
  const originalCreatedAt = customerJoinOutput.createdAt;
  const originalUpdatedAt = customerJoinOutput.updatedAt;

  // 3. Ensure we are authenticated as platform admin again (customer join may alter token)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoginOutput = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminLoginOutput);

  // 4. First admin-driven update: change email and set isVerified to false
  let newCustomerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  if (newCustomerEmail === originalCustomerEmail) {
    newCustomerEmail = typia.random<string & tags.Format<"email">>();
  }

  const firstUpdateBody = {
    email: newCustomerEmail,
    isVerified: false,
  } satisfies IShoppingMallCustomer.IUpdate;

  const firstUpdatedCustomer =
    await api.functional.shoppingMall.platformAdmin.customers.update(
      connection,
      {
        customerId,
        body: firstUpdateBody,
      },
    );
  typia.assert<IShoppingMallCustomer>(firstUpdatedCustomer);

  // Business validations after first update
  TestValidator.equals(
    "customer id stable after first admin update",
    firstUpdatedCustomer.id,
    customerId,
  );
  TestValidator.equals(
    "customer email updated by admin to new value",
    firstUpdatedCustomer.email,
    newCustomerEmail,
  );
  TestValidator.equals(
    "customer isVerified updated to false by admin",
    firstUpdatedCustomer.isVerified,
    false,
  );
  TestValidator.equals(
    "customer name preserved when not updated (first update)",
    firstUpdatedCustomer.name,
    customerName,
  );
  TestValidator.equals(
    "customer status preserved when not updated (first update)",
    firstUpdatedCustomer.status,
    originalStatus,
  );
  TestValidator.equals(
    "customer createdAt unchanged after first update",
    firstUpdatedCustomer.createdAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "customer updatedAt is not earlier than original after first update",
    firstUpdatedCustomer.updatedAt >= originalUpdatedAt,
  );

  // 5. Second admin-driven update: toggle isVerified back to true and tighten status
  const strictStatus = "blocked";
  const secondUpdateBody = {
    isVerified: true,
    status: strictStatus,
  } satisfies IShoppingMallCustomer.IUpdate;

  const secondUpdatedCustomer =
    await api.functional.shoppingMall.platformAdmin.customers.update(
      connection,
      {
        customerId,
        body: secondUpdateBody,
      },
    );
  typia.assert<IShoppingMallCustomer>(secondUpdatedCustomer);

  // Validations after second update
  TestValidator.equals(
    "customer id stable after second admin update",
    secondUpdatedCustomer.id,
    customerId,
  );
  TestValidator.equals(
    "customer email preserved when not updated (second update)",
    secondUpdatedCustomer.email,
    newCustomerEmail,
  );
  TestValidator.equals(
    "customer isVerified updated back to true by admin",
    secondUpdatedCustomer.isVerified,
    true,
  );
  TestValidator.equals(
    "customer status changed to stricter value by admin",
    secondUpdatedCustomer.status,
    strictStatus,
  );
  TestValidator.equals(
    "customer createdAt still unchanged after second update",
    secondUpdatedCustomer.createdAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "customer updatedAt is not earlier than after first update",
    secondUpdatedCustomer.updatedAt >= firstUpdatedCustomer.updatedAt,
  );
}
