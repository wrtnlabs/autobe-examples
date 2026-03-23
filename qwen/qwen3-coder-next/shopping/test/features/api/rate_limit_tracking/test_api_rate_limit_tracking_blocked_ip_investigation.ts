import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallRateLimitTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRateLimitTracking";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRateLimitTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRateLimitTracking";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_rate_limit_tracking_blocked_ip_investigation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Step 2: Retrieve paginated rate limit tracking records with blocked filter
  const trackingList =
    await api.functional.ecommerceMall.admin.rate_limit_trackings.index(
      adminConnection,
      {
        body: {
          blocked: true,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRateLimitTracking.IRequest,
      },
    );
  typia.assert(trackingList);
  // Step 3: Verify we have blocked tracking records
  TestValidator.predicate(
    "has blocked tracking records",
    () => trackingList.data.length > 0,
  );
  // Step 4: Get first blocked tracking record
  const blockedTracking = trackingList.data[0];
  typia.assert(blockedTracking);
  // Step 5: Fetch specific tracking record by ID
  const trackingRecord =
    await api.functional.ecommerceMall.admin.rate_limit_trackings.at(
      adminConnection,
      {
        trackingId: blockedTracking.id,
      },
    );
  typia.assert(trackingRecord);
  // Step 6: Validate blocked tracking record properties
  TestValidator.equals("blocked status", trackingRecord.blocked, true);
  // Validate blocked_until exists and is in the future
  if (
    trackingRecord.blocked_until !== null &&
    trackingRecord.blocked_until !== undefined
  ) {
    const safeUntil = trackingRecord.blocked_until satisfies string as string;
    TestValidator.predicate(
      "blocked_until is in future",
      () => new Date(safeUntil).getTime() > new Date().getTime(),
    );
  }
  // Step 7: Validate request_count exceeds threshold
  TestValidator.predicate(
    "request_count exceeds threshold",
    () => trackingRecord.request_count > 0,
  );
}
