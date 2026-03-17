import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallPlatformConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_platform_configurations_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminAuthConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminAuthConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 3. Request list of all platform configurations with no filters
  const response =
    await api.functional.ecommerceMall.admin.platform_configurations.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallPlatformConfiguration.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    response.pagination.pages ===
      (response.pagination.records === 0
        ? 0
        : Math.ceil(response.pagination.records / response.pagination.limit)),
  );
  // 5. Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // 6. Validate each configuration has required fields with correct types
  for (const config of response.data) {
    typia.assert<{
      id: string & tags.Format<"uuid">;
      configuration_key: string;
      description: string;
      configuration_type: string;
      scope: string;
      is_active: boolean;
    }>(config);
  }
  // 7. Validate pagination records match data length when on first page
  if (response.pagination.current === 1) {
    TestValidator.equals(
      "data length matches records on first page",
      response.data.length,
      Math.min(response.pagination.records, response.pagination.limit),
    );
  }
}
