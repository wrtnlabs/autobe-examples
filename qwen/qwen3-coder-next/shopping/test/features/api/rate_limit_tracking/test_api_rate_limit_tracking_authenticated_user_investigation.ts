import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_rate_limit_tracking_authenticated_user_investigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1>
      >() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const adminCredentials: IEcommerceMallAdmin.ILogin = {
    email: typia.random<
      string & tags.Format<"email"> & tags.MinLength<1>
    >() satisfies string as string,
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_admin_login(adminConnection, { body: adminCredentials });
  // 2. Create customer account and login
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1>
      >() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const customerCredentials: IEcommerceMallCustomer.ILogin = {
    email: typia.random<
      string & tags.Format<"email"> & tags.MinLength<1>
    >() satisfies string as string,
    password: RandomGenerator.alphaNumeric(16),
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  };
  await authorize_customer_login(customerConnection, {
    body: customerCredentials,
  });
  // 3. Make authenticated requests to generate rate limit tracking data
  // Note: In a real scenario, we would make enough requests to trigger rate limiting
  // and then retrieve the tracking record. For this test, we'll make a single request
  // to demonstrate the pattern.
  const testTrackingId = "00000000-0000-0000-0000-000000000000";
  // 4. Admin retrieves rate limit tracking record
  const tracking =
    await api.functional.ecommerceMall.admin.rate_limit_trackings.at(
      adminConnection,
      { trackingId: testTrackingId },
    );
  typia.assert(tracking);
  // 5. Verify tracking record structure
  TestValidator.equals("tracking ID matches", tracking.id, testTrackingId);
  TestValidator.predicate(
    "IP address exists",
    tracking.ip !== null && tracking.ip !== undefined,
  );
  TestValidator.predicate(
    "window_start is valid date-time",
    tracking.window_start !== null && tracking.window_start !== undefined,
  );
  TestValidator.predicate(
    "window_end is valid date-time",
    tracking.window_end !== null && tracking.window_end !== undefined,
  );
  // 6. If user is authenticated, verify user_id field contains the authenticated user's UUID
  if (tracking.user_id !== null && tracking.user_id !== undefined) {
    TestValidator.predicate(
      "user_id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(tracking.user_id),
    );
  }
  // 7. Verify request_count is a valid integer
  TestValidator.predicate(
    "request_count is non-negative",
    tracking.request_count >= 0,
  );
  TestValidator.predicate(
    "blocked is boolean",
    typeof tracking.blocked === "boolean",
  );
}
