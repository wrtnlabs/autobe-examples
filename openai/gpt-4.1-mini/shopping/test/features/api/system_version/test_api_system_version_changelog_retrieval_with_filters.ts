import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemVersion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_version_changelog_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve paginated changelog entries with filters and validate response
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const authorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(authorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorized.token.access;
  // 2. Prepare and perform changelog query with filters
  // We simulate multiple filter conditions including:
  // - entity_name substring
  // - version_number minimum
  // - changed_by substring
  // - created_at date range
  // Since the DTO for IRequest has no specified properties (empty), but scenario requires filters,
  // we create plausible properties according to scenario description (simulate realistic query)
  // However, since DTO schema types are empty objects, we assume filter properties are optional and
  // omitted in the real test, we do a call with an empty filter (as no filter fields are defined).
  // For demonstration, we will call with empty object because no properties are defined in IRequest
  const changelogBody: IShoppingMallSystemVersion.IRequest = {};
  const response =
    await api.functional.shoppingMall.administrator.system_versions.changelog.index(
      adminConnection,
      { body: changelogBody },
    );
  // Validate response structure
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be at least 1",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages count should be at least 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "total records should not be negative",
    response.pagination.records >= 0,
  );
  // Validate data list has length not exceeding limit
  TestValidator.predicate(
    "response data length must not exceed pagination limit",
    response.data.length <= response.pagination.limit,
  );
  // For each item, assert type correctness
  for (const item of response.data) {
    typia.assert(item); // Each item is IShoppingMallSystemVersion.ISummary
  }
}
