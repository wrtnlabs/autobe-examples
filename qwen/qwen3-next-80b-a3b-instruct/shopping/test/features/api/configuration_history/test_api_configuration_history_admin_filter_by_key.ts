import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfigHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigHistory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_configuration_history_admin_filter_by_key(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Test exact key match
  const exactMatch = "payment.gateway.enabled";
  const exactResponse =
    await api.functional.shoppingMall.admin.compliance.config_histories.index(
      adminConnection,
      {
        body: {
          config_key: exactMatch,
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
  typia.assert(exactResponse);
  // Verify there is at least one result (system should have pre-existing records)
  TestValidator.predicate(
    "at least one exact match exists",
    () => exactResponse.data.length >= 1,
  );
  // Validate partial key match (prefix)
  const partialMatch = "payment.gateway";
  const partialResponse =
    await api.functional.shoppingMall.admin.compliance.config_histories.index(
      adminConnection,
      {
        body: {
          config_key: partialMatch,
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
  typia.assert(partialResponse);
  // Verify there is at least one result
  TestValidator.predicate(
    "at least one partial match exists",
    () => partialResponse.data.length >= 1,
  );
  // Validate timestamp sorting is descending (newest first)
  // Extract all timestamps from response
  const timestamps = partialResponse.data.map(
    (record) => new Date(record.timestamp),
  );
  // Sort by timestamp descending (newest first)
  const sortedTimestamps = [...timestamps].sort(
    (a, b) => b.getTime() - a.getTime(),
  );
  // Verify the API response is already sorted descending
  TestValidator.equals(
    "timestamp sorted descending",
    sortedTimestamps.map((t) => t.toISOString()).join(","),
    timestamps.map((t) => t.toISOString()).join(","),
  );
  // Test pagination
  const pageResponse =
    await api.functional.shoppingMall.admin.compliance.config_histories.index(
      adminConnection,
      {
        body: {
          config_key: "payment.gateway",
          limit: 1,
          page: 1,
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
  typia.assert(pageResponse);
  TestValidator.equals("page 1 has limit 1", pageResponse.data.length, 1);
  const page2Response =
    await api.functional.shoppingMall.admin.compliance.config_histories.index(
      adminConnection,
      {
        body: {
          config_key: "payment.gateway",
          limit: 1,
          page: 2,
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2 has limit 1", page2Response.data.length, 1);
  // Verify different records on different pages
  TestValidator.notEquals(
    "page 1 and page 2 have different records",
    pageResponse.data[0].id,
    page2Response.data[0].id,
  );
  // Test unauthorized access with guest connection (no authentication)
  const guestConnection: api.IConnection = { host: connection.host };
  // No authorization - this is an unauthenticated request
  await TestValidator.error("unauthorized guest gets 403", async () => {
    await api.functional.shoppingMall.admin.compliance.config_histories.index(
      guestConnection,
      {
        body: {
          config_key: "payment.gateway.enabled",
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
  });
}
