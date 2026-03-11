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

export async function test_api_admin_rate_limit_tracking_filter_by_ip(
  connection: api.IConnection,
): Promise<void> {
  // Admin login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Call rate limit tracking API with IP filter
  const result =
    await api.functional.ecommerceMall.admin.rate_limit_trackings.index(
      adminConnection,
      {
        body: {
          ip: "192.168.1.100",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallRateLimitTracking.IRequest,
      },
    );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals("pagination exists", result.pagination !== null, true);
  TestValidator.equals(
    "pagination has correct fields",
    typeof result.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination limit valid",
    result.pagination.limit <= 100,
    true,
  );
  TestValidator.equals(
    "pagination records non-negative",
    result.pagination.records >= 0,
    true,
  );
  // Validate data structure
  TestValidator.equals("data array exists", result.data !== null, true);
  TestValidator.predicate("data items are valid", () =>
    result.data.every((r) => r.ip !== null && r.ip !== undefined),
  );
  // Validate each record has required fields
  result.data.forEach((r) => {
    TestValidator.equals("record has id", r.id !== null, true);
    TestValidator.equals("record has ip", r.ip !== null, true);
    TestValidator.equals(
      "record has window_start",
      r.window_start !== null,
      true,
    );
    TestValidator.equals("record has window_end", r.window_end !== null, true);
    TestValidator.equals(
      "record has blocked field",
      typeof r.blocked === "boolean",
      true,
    );
  });
}
