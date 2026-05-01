import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin guest listing filtered by device fingerprint and active status.
 *
 * Validates the administrative guest search endpoint's ability to filter by
 * partial device fingerprint matching combined with the active-only toggle.
 * Ensures that the endpoint correctly applies both filters simultaneously and
 * that pagination metadata accurately reflects the filtered result set.
 *
 * 1. Administrator registers and authenticates via the join endpoint.
 * 2. Administrator searches guests with a random device fingerprint substring
 *    and active_only set to true.
 * 3. Validates all returned guests have device_fingerprint containing the
 *    search substring.
 * 4. Validates all returned guests have null deleted_at (active only, no
 *    cleaned-up guests).
 * 5. Validates pagination metadata consistency — returned data length does not
 *    exceed the configured limit per page.
 */
export async function test_api_guest_list_filtered_by_fingerprint_and_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Search with device_fingerprint partial match and active_only
  const searchFingerprint = RandomGenerator.alphaNumeric(3);
  const result = await api.functional.shoppingMall.admin.guests.index(
    adminConnection,
    {
      body: {
        device_fingerprint: searchFingerprint,
        active_only: true,
      } satisfies IShoppingMallGuest.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate all returned guests contain the search fingerprint substring
  TestValidator.predicate(
    "all returned guests contain search fingerprint substring",
    result.data.every((guest) =>
      guest.device_fingerprint.includes(searchFingerprint),
    ),
  );
  // 4. Validate no cleaned-up (soft-deleted) guests appear in results
  TestValidator.predicate(
    "no cleaned-up guests in filtered results",
    result.data.every((guest) => guest.deleted_at === null),
  );
  // 5. Validate pagination metadata consistency
  TestValidator.predicate(
    "returned data length does not exceed pagination limit",
    result.data.length <= result.pagination.limit,
  );
}
