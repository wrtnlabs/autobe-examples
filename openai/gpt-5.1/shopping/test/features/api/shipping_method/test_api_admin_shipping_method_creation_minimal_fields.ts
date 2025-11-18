import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

export async function test_api_admin_shipping_method_creation_minimal_fields(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin so that admin-only endpoints are accessible.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare minimal shipping method creation payload.
  const methodCodePrefix = "eco_ground_";
  const uniqueSuffix = RandomGenerator.alphaNumeric(8);
  const methodCode = `${methodCodePrefix}${uniqueSuffix}`;

  const shippingCreateBody = {
    method_code: methodCode,
    display_name: "Eco Ground Shipping",
    service_level_description: null,
  } satisfies IShoppingMallShippingMethod.ICreate;

  // 3. Call the shipping method creation endpoint as the authenticated admin.
  const created: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(created);

  // 4. Validate that core fields in the response match the request.
  TestValidator.equals(
    "shipping method_code matches requested",
    created.method_code,
    shippingCreateBody.method_code,
  );

  TestValidator.equals(
    "shipping display_name matches requested",
    created.display_name,
    shippingCreateBody.display_name,
  );

  TestValidator.equals(
    "shipping service_level_description is null",
    created.service_level_description ?? null,
    null,
  );

  // 5. Validate id presence (UUID format is already guaranteed by typia.assert).
  TestValidator.predicate("shipping id is non-empty", created.id.length > 0);

  // 6. Validate created_at and updated_at are very close in time on initial creation.
  const createdAt = new Date(created.created_at);
  const updatedAt = new Date(created.updated_at);

  const diffMs = Math.abs(updatedAt.getTime() - createdAt.getTime());
  TestValidator.predicate(
    "created_at and updated_at are within 5 seconds of each other",
    diffMs <= 5_000,
  );

  // Optional sanity: timestamps are reasonably close to now (within 60 seconds).
  const now = Date.now();
  const createdOffset = Math.abs(createdAt.getTime() - now);
  const updatedOffset = Math.abs(updatedAt.getTime() - now);

  TestValidator.predicate(
    "created_at is within 60 seconds of now",
    createdOffset <= 60_000,
  );

  TestValidator.predicate(
    "updated_at is within 60 seconds of now",
    updatedOffset <= 60_000,
  );
}
