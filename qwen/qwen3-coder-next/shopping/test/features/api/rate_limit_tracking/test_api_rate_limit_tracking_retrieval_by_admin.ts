import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallRateLimitTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRateLimitTracking";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_rate_limit_tracking_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: "super_admin@test.com",
      password: "SuperAdmin123!",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Test: Retrieve rate limit tracking with valid tracking ID
  const tracking = typia.random<IEcommerceMallRateLimitTracking>();
  const result =
    await api.functional.ecommerceMall.admin.rate_limit_trackings.at(
      superAdminConnection,
      {
        trackingId: tracking.id,
      },
    );
  typia.assert(result);
  // 3. Validate: Check required fields and null handling
  TestValidator.equals("tracking ID matches", result.id, tracking.id);
  TestValidator.predicate(
    "IP address exists",
    typeof result.ip === "string" && result.ip.length > 0,
  );
  TestValidator.predicate(
    "request count is valid",
    typeof result.request_count === "number" && result.request_count >= 0,
  );
  TestValidator.predicate(
    "window_start is valid date-time",
    typeof result.window_start === "string" && result.window_start.length > 0,
  );
  TestValidator.predicate(
    "window_end is valid date-time",
    typeof result.window_end === "string" && result.window_end.length > 0,
  );
  TestValidator.equals(
    "blocked is boolean",
    typeof result.blocked === "boolean",
    true,
  );
  // 4. Test: Regular admin cannot access this endpoint
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(regularAdminConnection, {
    body: {
      email: "regular_admin@test.com",
      password: "RegularAdmin123!",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  await TestValidator.error("regular admin cannot access", async () => {
    await api.functional.ecommerceMall.admin.rate_limit_trackings.at(
      regularAdminConnection,
      {
        trackingId: tracking.id,
      },
    );
  });
}
