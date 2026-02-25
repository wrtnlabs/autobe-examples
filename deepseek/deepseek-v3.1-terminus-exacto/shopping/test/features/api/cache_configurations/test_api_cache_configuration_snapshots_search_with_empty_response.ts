import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cache_configuration_snapshots_search_with_empty_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Generate random cache configuration ID
  const configId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create search criteria that guarantees no matches
  const searchCriteria: IEcommerceCacheConfigurationSnapshot.IRequest = {
    // Use status filter that doesn't exist in the enum (nonexistent status)
    status: "nonexistent" as "active",
    // Set impossible date ranges (future dates when no snapshots exist)
    suspension_start_date_min: new Date().toISOString(),
    suspension_start_date_max: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    // Use email that doesn't exist
    seller_email: typia.random<string & tags.Format<"email">>(),
    administrator_email: typia.random<string & tags.Format<"email">>(),
    // Use impossible search text
    suspension_reason_search: "THIS_TEXT_CANNOT_EXIST_ANYWHERE_12345",
    // Set reasonable pagination
    page: 1,
    limit: 10,
  } satisfies IEcommerceCacheConfigurationSnapshot.IRequest;
  // 4. Call the search endpoint
  const response =
    await api.functional.ecommerce.administrator.cache_configurations.snapshots.index(
      adminConnection,
      {
        configId,
        body: searchCriteria,
      },
    );
  // 5. Validate response type
  typia.assert(response);
  // 6. Assert empty results with proper pagination
  TestValidator.equals(
    "data array should be empty when no matches",
    response.data,
    [] as IEcommerceCacheConfigurationSnapshot.ISummary[],
  );
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    response.pagination.limit,
    10,
  );
}
