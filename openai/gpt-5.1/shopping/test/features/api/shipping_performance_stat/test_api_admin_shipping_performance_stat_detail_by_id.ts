import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallShippingPerformanceStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPerformanceStat";

/**
 * Validate that an authenticated admin can retrieve a detailed shipping
 * performance statistics snapshot by its ID and that the returned structure is
 * self-consistent.
 *
 * Business flow:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authorized admin
 *    session (SDK sets Authorization header).
 * 2. Generate a UUID to represent shippingPerformanceStatId. In simulation mode
 *    this will be accepted and a mock IShoppingMallShippingPerformanceStat will
 *    be returned; in a fully wired environment this would correspond to an
 *    existing snapshot record.
 * 3. Call GET
 *    /shoppingMall/admin/analytics/shippingPerformanceStats/{shippingPerformanceStatId}
 *    through the typed SDK accessor.
 * 4. Assert the response type with typia.assert and then perform additional
 *    business validations:
 *
 *    - Id matches the requested shippingPerformanceStatId
 *    - Shipment_*_count fields are non-negative
 *    - On_time_delivery_rate is between 0 and 1 inclusive
 *    - Created_at and updated_at are present (typia.assert already enforces
 *         structure and formats)
 *    - When shopping_mall_shipping_method_id and shipping_method are both non-null,
 *         shipping_method.id equals shopping_mall_shipping_method_id,
 *         shipping_method.method_code equals shipping_method_code, and
 *         shipping_method.display_name is non-empty.
 */
export async function test_api_admin_shipping_performance_stat_detail_by_id(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authorized session.
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

  // 2. Prepare a target shippingPerformanceStatId.
  const shippingPerformanceStatId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Call the detail endpoint.
  const stat: IShoppingMallShippingPerformanceStat =
    await api.functional.shoppingMall.admin.analytics.shippingPerformanceStats.at(
      connection,
      {
        shippingPerformanceStatId,
      },
    );
  typia.assert<IShoppingMallShippingPerformanceStat>(stat);

  // 4. Business rule validations.

  // 4-1. The id in the payload must match the requested path parameter.
  TestValidator.equals(
    "detail id should match requested shippingPerformanceStatId",
    stat.id,
    shippingPerformanceStatId,
  );

  // 4-2. Non-negative shipment counts.
  TestValidator.predicate(
    "shipment_created_count must be non-negative",
    stat.shipment_created_count >= 0,
  );
  TestValidator.predicate(
    "shipment_shipped_count must be non-negative",
    stat.shipment_shipped_count >= 0,
  );
  TestValidator.predicate(
    "shipment_delivered_count must be non-negative",
    stat.shipment_delivered_count >= 0,
  );
  TestValidator.predicate(
    "shipment_delivery_failed_count must be non-negative",
    stat.shipment_delivery_failed_count >= 0,
  );
  TestValidator.predicate(
    "shipment_returned_count must be non-negative",
    stat.shipment_returned_count >= 0,
  );

  // 4-3. on_time_delivery_rate between 0 and 1 inclusive.
  TestValidator.predicate(
    "on_time_delivery_rate must be between 0 and 1 inclusive",
    stat.on_time_delivery_rate >= 0 && stat.on_time_delivery_rate <= 1,
  );

  // 4-4. Optional shipping_method consistency when present.
  if (
    stat.shopping_mall_shipping_method_id !== null &&
    stat.shopping_mall_shipping_method_id !== undefined &&
    stat.shipping_method !== null &&
    stat.shipping_method !== undefined
  ) {
    const shippingMethod: IShoppingMallShippingMethod.ISummary =
      stat.shipping_method;

    TestValidator.equals(
      "shipping_method.id must match shopping_mall_shipping_method_id",
      shippingMethod.id,
      stat.shopping_mall_shipping_method_id,
    );
    TestValidator.equals(
      "shipping_method.method_code must match shipping_method_code",
      shippingMethod.method_code,
      stat.shipping_method_code,
    );
    TestValidator.predicate(
      "shipping_method.display_name must be non-empty",
      shippingMethod.display_name.length > 0,
    );
  }
}
