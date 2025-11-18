import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

export async function test_api_admin_shipping_method_update_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Admin setup and baseline shipping method creation
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const methodCode = `e2e-admin-update-${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    method_code: methodCode,
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    service_level_description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  const created: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  TestValidator.equals(
    "created method_code must match input",
    created.method_code,
    methodCode,
  );

  const originalDisplayName = created.display_name;
  const originalDescription = created.service_level_description ?? null;

  // 2. Unauthenticated update must fail and not mutate data
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const unauthUpdateBody = {
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    service_level_description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallShippingMethod.IUpdate;

  await TestValidator.error("unauthenticated update must fail", async () => {
    await api.functional.shoppingMall.admin.shippingMethods.update(
      anonymousConnection,
      {
        methodCode,
        body: unauthUpdateBody,
      },
    );
  });

  const afterUnauth: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.shippingMethods.at(connection, {
      methodCode,
    });
  typia.assert(afterUnauth);

  TestValidator.equals(
    "unauthenticated update must not change display_name",
    afterUnauth.display_name,
    originalDisplayName,
  );
  TestValidator.equals(
    "unauthenticated update must not change service_level_description",
    afterUnauth.service_level_description ?? null,
    originalDescription,
  );

  // 3. Customer-authenticated update must fail and not mutate data
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerUpdateBody = {
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    service_level_description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallShippingMethod.IUpdate;

  await TestValidator.error("customer update must fail", async () => {
    await api.functional.shoppingMall.admin.shippingMethods.update(connection, {
      methodCode,
      body: customerUpdateBody,
    });
  });

  const afterCustomer: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.shippingMethods.at(connection, {
      methodCode,
    });
  typia.assert(afterCustomer);

  TestValidator.equals(
    "customer update must not change display_name",
    afterCustomer.display_name,
    originalDisplayName,
  );
  TestValidator.equals(
    "customer update must not change service_level_description",
    afterCustomer.service_level_description ?? null,
    originalDescription,
  );

  // 4. Positive admin-authenticated update succeeds
  const reAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const reAdminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: reAdminJoinBody,
    });
  typia.assert(reAdminAuthorized);

  const finalUpdateBody = {
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    service_level_description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallShippingMethod.IUpdate;

  const updated: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.update(connection, {
      methodCode,
      body: finalUpdateBody,
    });
  typia.assert(updated);

  TestValidator.equals(
    "admin update must change display_name",
    updated.display_name,
    finalUpdateBody.display_name,
  );
  TestValidator.equals(
    "admin update must change service_level_description",
    updated.service_level_description ?? null,
    finalUpdateBody.service_level_description ?? null,
  );

  const afterFinal: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.shippingMethods.at(connection, {
      methodCode,
    });
  typia.assert(afterFinal);

  TestValidator.equals(
    "final read display_name must match updated value",
    afterFinal.display_name,
    finalUpdateBody.display_name,
  );
  TestValidator.equals(
    "final read service_level_description must match updated value",
    afterFinal.service_level_description ?? null,
    finalUpdateBody.service_level_description ?? null,
  );
}
