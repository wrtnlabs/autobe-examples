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

export async function test_api_platform_admin_customer_update_partial_fields_preserve_others(
  connection: api.IConnection,
) {
  // 1. Register a new customer (self-join) and capture baseline identity
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "customer-password-1234",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  const customerId = customerAuthorized.id;
  const baselineEmail = customerAuthorized.email;
  const baselineName = customerAuthorized.name;
  const baselineStatus = customerAuthorized.status;
  const baselineCreatedAt = customerAuthorized.createdAt;
  const baselineUpdatedAt = customerAuthorized.updatedAt;

  // 2. Register a platform admin; SDK will set Authorization header for admin actor
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "platform-admin-password-1234",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdmin);

  // 3. First partial update: change only name, preserve email/status/isVerified implicitly
  const firstUpdatedName = RandomGenerator.name();
  const firstUpdateBody = {
    name: firstUpdatedName,
  } satisfies IShoppingMallCustomer.IUpdate;

  const afterFirstUpdate: IShoppingMallCustomer =
    await api.functional.shoppingMall.platformAdmin.customers.update(
      connection,
      {
        customerId,
        body: firstUpdateBody,
      },
    );
  typia.assert<IShoppingMallCustomer>(afterFirstUpdate);

  // Basic identity invariants after first update
  TestValidator.equals(
    "customer id should remain the same after first partial update",
    afterFirstUpdate.id,
    customerId,
  );

  // Name should be updated
  TestValidator.equals(
    "name should be updated on first partial update",
    afterFirstUpdate.name,
    firstUpdatedName,
  );

  // Email must be preserved
  TestValidator.equals(
    "email should be preserved when omitted in IUpdate (first update)",
    afterFirstUpdate.email,
    baselineEmail,
  );

  // Status must be preserved
  TestValidator.equals(
    "status should be preserved when omitted in IUpdate (first update)",
    afterFirstUpdate.status,
    baselineStatus,
  );

  // createdAt must not change
  TestValidator.equals(
    "createdAt should remain unchanged after first partial update",
    afterFirstUpdate.createdAt,
    baselineCreatedAt,
  );

  // updatedAt must be advanced (just require inequality)
  TestValidator.notEquals(
    "updatedAt should change after first partial update",
    afterFirstUpdate.updatedAt,
    baselineUpdatedAt,
  );

  const firstUpdatedAt = afterFirstUpdate.updatedAt;

  // 4. Second partial update: change only status, preserve other fields implicitly
  const secondUpdatedStatus =
    afterFirstUpdate.status === "active" ? "suspended" : "active";

  const secondUpdateBody = {
    status: secondUpdatedStatus,
  } satisfies IShoppingMallCustomer.IUpdate;

  const afterSecondUpdate: IShoppingMallCustomer =
    await api.functional.shoppingMall.platformAdmin.customers.update(
      connection,
      {
        customerId,
        body: secondUpdateBody,
      },
    );
  typia.assert<IShoppingMallCustomer>(afterSecondUpdate);

  // Identity invariants after second update
  TestValidator.equals(
    "customer id should remain the same after second partial update",
    afterSecondUpdate.id,
    customerId,
  );

  // Status should be updated to new value
  TestValidator.equals(
    "status should be updated on second partial update",
    afterSecondUpdate.status,
    secondUpdatedStatus,
  );

  // Name should stay as set in first update
  TestValidator.equals(
    "name should be preserved from first update when omitted in second",
    afterSecondUpdate.name,
    afterFirstUpdate.name,
  );

  // Email should remain whatever it was after first update (original email)
  TestValidator.equals(
    "email should remain original across both partial updates",
    afterSecondUpdate.email,
    afterFirstUpdate.email,
  );

  // isVerified should remain stable across both partial updates
  TestValidator.equals(
    "isVerified should remain stable across both partial updates",
    afterSecondUpdate.isVerified,
    afterFirstUpdate.isVerified,
  );

  // createdAt must still be original
  TestValidator.equals(
    "createdAt should remain unchanged after second partial update",
    afterSecondUpdate.createdAt,
    baselineCreatedAt,
  );

  // updatedAt must advance again
  TestValidator.notEquals(
    "updatedAt should change again after second partial update",
    afterSecondUpdate.updatedAt,
    firstUpdatedAt,
  );
}
