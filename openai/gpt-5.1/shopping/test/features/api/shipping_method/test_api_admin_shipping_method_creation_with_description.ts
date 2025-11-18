import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Ensure an authenticated admin can create a shipping method with a
 * service-level description and that this metadata persists.
 *
 * Business flow:
 *
 * 1. Admin joins via /auth/admin/join to obtain an authenticated admin context.
 * 2. Admin creates a new shipping method via POST
 *    /shoppingMall/admin/shippingMethods using
 *    IShoppingMallShippingMethod.ICreate, including a non-empty
 *    service_level_description.
 * 3. Validate that the response echoes method_code, display_name, and
 *    service_level_description and that created_at/updated_at are set with
 *    updated_at >= created_at.
 * 4. Fetch the same shipping method by method_code using GET
 *    /shoppingMall/shippingMethods/{methodCode} and confirm that the
 *    description and other core fields persisted.
 */
export async function test_api_admin_shipping_method_creation_with_description(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized admin context
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Admin creates a new shipping method with description
  const methodCode: string = `standard-${RandomGenerator.alphaNumeric(8)}`;
  const displayName: string = `Standard 2-Day ${RandomGenerator.alphabets(4)}`;
  const serviceDescription: string = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 8,
  });

  const createBody = {
    method_code: methodCode,
    display_name: displayName,
    service_level_description: serviceDescription,
  } satisfies IShoppingMallShippingMethod.ICreate;

  const created: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallShippingMethod>(created);

  // 3. Validate echo of core fields and timestamps
  TestValidator.equals(
    "created shipping method method_code should match request",
    created.method_code,
    methodCode,
  );
  TestValidator.equals(
    "created shipping method display_name should match request",
    created.display_name,
    displayName,
  );
  TestValidator.equals(
    "created shipping method service_level_description should match request",
    created.service_level_description,
    serviceDescription,
  );

  const createdAt = new Date(created.created_at);
  const updatedAt = new Date(created.updated_at);

  TestValidator.predicate(
    "created_at should be a valid date",
    !Number.isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be a valid date",
    !Number.isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    updatedAt.getTime() >= createdAt.getTime(),
  );

  // 4. Fetch by methodCode and confirm persistence
  const fetched: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.shippingMethods.at(connection, {
      methodCode,
    });
  typia.assert<IShoppingMallShippingMethod>(fetched);

  TestValidator.equals(
    "fetched shipping method method_code should match created",
    fetched.method_code,
    created.method_code,
  );
  TestValidator.equals(
    "fetched shipping method display_name should match created",
    fetched.display_name,
    created.display_name,
  );
  TestValidator.equals(
    "fetched shipping method service_level_description should match created",
    fetched.service_level_description,
    created.service_level_description,
  );
}
