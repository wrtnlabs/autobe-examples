import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingMethod";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

export async function test_api_admin_shipping_method_delete_after_listing(
  connection: api.IConnection,
) {
  // 1. Join as admin to obtain authorization context (token handled by SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create two distinct shipping methods
  const methodBody1 = {
    method_code: `standard-${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Standard Shipping",
    service_level_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  const methodBody2 = {
    method_code: `express-${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Express Shipping",
    service_level_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  const created1: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: methodBody1,
    });
  typia.assert<IShoppingMallShippingMethod>(created1);

  const created2: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: methodBody2,
    });
  typia.assert<IShoppingMallShippingMethod>(created2);

  // quick sanity check on method codes
  TestValidator.notEquals(
    "created shipping method codes must be distinct",
    created1.method_code,
    created2.method_code,
  );

  // 3. List shipping methods with deterministic filters
  const request1 = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    search: null,
    sort_by: "method_code",
    sort_direction: "asc" as "asc" | "desc" | null,
  } satisfies IShoppingMallShippingMethod.IRequest;

  const page1: IPageIShoppingMallShippingMethod.ISummary =
    await api.functional.shoppingMall.admin.shippingMethods.index(connection, {
      body: request1,
    });
  typia.assert<IPageIShoppingMallShippingMethod.ISummary>(page1);

  // verify that both created methods are present in the list
  const codes1 = page1.data.map((row) => row.method_code);

  TestValidator.predicate(
    "first created shipping method should be present before deletion",
    codes1.includes(created1.method_code),
  );
  TestValidator.predicate(
    "second created shipping method should be present before deletion",
    codes1.includes(created2.method_code),
  );

  // 4. Delete one of the methods (e.g., the second one)
  await api.functional.shoppingMall.admin.shippingMethods.erase(connection, {
    methodCode: created2.method_code,
  });

  // 5. List shipping methods again with the same filters
  const page2: IPageIShoppingMallShippingMethod.ISummary =
    await api.functional.shoppingMall.admin.shippingMethods.index(connection, {
      body: request1,
    });
  typia.assert<IPageIShoppingMallShippingMethod.ISummary>(page2);

  const codes2 = page2.data.map((row) => row.method_code);

  // the deleted method must be absent
  TestValidator.predicate(
    "deleted shipping method should not appear after deletion",
    codes2.includes(created2.method_code) === false,
  );

  // the non-deleted method must still be present
  TestValidator.predicate(
    "non-deleted shipping method should remain after deletion",
    codes2.includes(created1.method_code),
  );

  // Optional: verify pagination metadata is consistent with limit constraints
  TestValidator.predicate(
    "pagination limit should match requested limit",
    page1.pagination.limit === request1.limit &&
      page2.pagination.limit === request1.limit,
  );
}
