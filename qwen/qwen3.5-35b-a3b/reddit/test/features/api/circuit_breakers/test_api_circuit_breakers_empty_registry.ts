import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCircuitBreaker } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCircuitBreaker";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCircuitBreaker } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCircuitBreaker";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_circuit_breakers_empty_registry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Call circuit breakers endpoint
  const response =
    await api.functional.redditPlatform.admin.circuit_breakers.list(
      adminConnection,
    );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("page size is 10", response.pagination.limit, 10);
  TestValidator.equals("total items is 0", response.pagination.records, 0);
  TestValidator.equals("total pages is 0", response.pagination.pages, 0);
  // 4. Validate data array is empty
  TestValidator.equals("data array is empty", response.data, []);
}
