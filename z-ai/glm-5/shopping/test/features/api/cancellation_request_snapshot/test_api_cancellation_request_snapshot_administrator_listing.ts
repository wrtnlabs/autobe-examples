import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator listing of cancellation request snapshots.
 *
 * This test validates that an administrator can retrieve a paginated list
 * of cancellation request snapshots with proper sorting and pagination metadata.
 * Snapshots are sorted by created_at in descending order by default.
 */
export async function test_api_cancellation_request_snapshot_administrator_listing(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using utility function
  await authorize_administrator_join(adminConnection, {});
  // Call the API with pagination parameters
  const result =
    await api.functional.shoppingMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 20);
  TestValidator.predicate("data count within limit", result.data.length <= 20);
  // Validate sorting - snapshots should be sorted by created_at descending by default
  for (let i = 1; i < result.data.length; i++) {
    const prevCreatedAt = new Date(result.data[i - 1].created_at).getTime();
    const currCreatedAt = new Date(result.data[i].created_at).getTime();
    TestValidator.predicate(
      "sorted by created_at descending",
      prevCreatedAt >= currCreatedAt,
    );
  }
}
