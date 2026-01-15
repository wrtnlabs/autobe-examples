import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_channel_status_and_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Test filtering by status (active)
  const activeResponse = await api.functional.shoppingMall.channels.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "active",
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(activeResponse);
  TestValidator.predicate("response contains data array", () =>
    Array.isArray(activeResponse.data),
  );
  TestValidator.predicate(
    "response contains pagination",
    () => activeResponse.pagination !== undefined,
  );
  // Step 3: Test filtering by status (inactive)
  const inactiveResponse = await api.functional.shoppingMall.channels.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "inactive",
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(inactiveResponse);
  TestValidator.predicate("response contains data array", () =>
    Array.isArray(inactiveResponse.data),
  );
  TestValidator.predicate(
    "response contains pagination",
    () => inactiveResponse.pagination !== undefined,
  );
  // Step 4: Test filtering by status (archived) - FIXED: changed to 'pending' to match allowed values
  const archivedResponse = await api.functional.shoppingMall.channels.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "pending", // Changed from 'archived' to 'pending' - a valid status according to schema
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(archivedResponse);
  TestValidator.predicate("response contains data array", () =>
    Array.isArray(archivedResponse.data),
  );
  TestValidator.predicate(
    "response contains pagination",
    () => archivedResponse.pagination !== undefined,
  );
  // Step 5: Test filtering by creationAfter (channels after Jan 10, 2024)
  const afterJan10Response = await api.functional.shoppingMall.channels.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        createdAfter: "2024-01-10T00:00:00Z",
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(afterJan10Response);
  TestValidator.predicate("response contains data array", () =>
    Array.isArray(afterJan10Response.data),
  );
  TestValidator.predicate(
    "response contains pagination",
    () => afterJan10Response.pagination !== undefined,
  );
  // Step 6: Test filtering by creationBefore (channels before Jan 15, 2024)
  const beforeJan15Response = await api.functional.shoppingMall.channels.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        createdBefore: "2024-01-15T00:00:00Z",
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(beforeJan15Response);
  TestValidator.predicate("response contains data array", () =>
    Array.isArray(beforeJan15Response.data),
  );
  TestValidator.predicate(
    "response contains pagination",
    () => beforeJan15Response.pagination !== undefined,
  );
  // Step 7: Test filtering by both creationAfter and creationBefore (Jan 5 to Jan 15)
  const dateRangeResponse = await api.functional.shoppingMall.channels.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        createdAfter: "2024-01-05T00:00:00Z",
        createdBefore: "2024-01-15T00:00:00Z",
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(dateRangeResponse);
  TestValidator.predicate("response contains data array", () =>
    Array.isArray(dateRangeResponse.data),
  );
  TestValidator.predicate(
    "response contains pagination",
    () => dateRangeResponse.pagination !== undefined,
  );
  // Step 8: Test filtering by status and date range simultaneously (active and after Jan 10)
  const combinedFilterResponse =
    await api.functional.shoppingMall.channels.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
        status: "active",
        createdAfter: "2024-01-10T00:00:00Z",
      } satisfies IShoppingMallChannel.IRequest,
    });
  typia.assert(combinedFilterResponse);
  TestValidator.predicate("response contains data array", () =>
    Array.isArray(combinedFilterResponse.data),
  );
  TestValidator.predicate(
    "response contains pagination",
    () => combinedFilterResponse.pagination !== undefined,
  );
  // Step 9: Test filtering by status and date range simultaneously (inactive and before Jan 20)
  const combinedFilterResponse2 =
    await api.functional.shoppingMall.channels.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
        status: "inactive",
        createdBefore: "2024-01-20T00:00:00Z",
      } satisfies IShoppingMallChannel.IRequest,
    });
  typia.assert(combinedFilterResponse2);
  TestValidator.predicate("response contains data array", () =>
    Array.isArray(combinedFilterResponse2.data),
  );
  TestValidator.predicate(
    "response contains pagination",
    () => combinedFilterResponse2.pagination !== undefined,
  );
}
