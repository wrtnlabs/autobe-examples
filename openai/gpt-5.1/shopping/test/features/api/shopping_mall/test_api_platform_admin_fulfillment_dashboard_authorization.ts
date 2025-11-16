import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFulfillmentDashboardOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentDashboardOverview";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_fulfillment_dashboard_authorization(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection by shallow-cloning and resetting headers
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 1-A. Ensure that calling the dashboard overview without authentication fails
  await TestValidator.error(
    "unauthenticated platform admin cannot access fulfillment dashboard overview",
    async () => {
      await api.functional.shoppingMall.platformAdmin.fulfillment.dashboard.overview(
        unauthenticated,
      );
    },
  );

  // 2. Register (join) a new platform admin and authenticate the main connection
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinBody = {
    email,
    name: RandomGenerator.name(),
    password: `P@ssw0rd-${RandomGenerator.alphaNumeric(12)}`,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // Basic sanity checks on the authorized admin and its token
  TestValidator.equals(
    "platform admin join returns same email as requested",
    admin.email,
    joinBody.email,
  );
  TestValidator.predicate(
    "platform admin token.access must be a non-empty string",
    admin.token.access.length > 0,
  );
  TestValidator.predicate(
    "platform admin account must be marked active in the authorized payload",
    admin.isActive === true,
  );

  // 3. With authenticated platform admin context, access the dashboard overview
  const overview =
    await api.functional.shoppingMall.platformAdmin.fulfillment.dashboard.overview(
      connection,
    );
  typia.assert<IShoppingMallFulfillmentDashboardOverview>(overview);

  // 4. Perform light-touch business sanity checks on aggregated metrics
  TestValidator.predicate(
    "totalFulfillments is a non-negative integer",
    overview.totalFulfillments >= 0,
  );

  TestValidator.predicate(
    "all fulfillment status buckets have non-negative counts",
    overview.fulfillmentsByStatus.every((bucket) => bucket.count >= 0),
  );

  TestValidator.predicate(
    "all shipment status buckets have non-negative counts",
    overview.shipmentsByStatus.every((bucket) => bucket.count >= 0),
  );

  TestValidator.predicate(
    "all shipment carrier buckets have non-negative shipmentCount",
    overview.shipmentsByCarrier.every((bucket) => bucket.shipmentCount >= 0),
  );
}
