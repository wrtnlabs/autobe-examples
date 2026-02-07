import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityApiKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityApiKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityApiKey } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityApiKey";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_api_key_list_admin_with_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Admin setup: Create and authorize an admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Test 1: Get all API keys with default parameters
  const allResponse = await api.functional.community.admin.api_keys.index(
    adminConnection,
    {
      body: {} satisfies ICommunityApiKey.IRequest,
    },
  );
  typia.assert(allResponse);
  // Test 2: Filter by status - active
  const activeResponse = await api.functional.community.admin.api_keys.index(
    adminConnection,
    {
      body: {
        status: "active",
      } satisfies ICommunityApiKey.IRequest,
    },
  );
  typia.assert(activeResponse);
  // Test 3: Filter by status - expired
  const expiredResponse = await api.functional.community.admin.api_keys.index(
    adminConnection,
    {
      body: {
        status: "expired",
      } satisfies ICommunityApiKey.IRequest,
    },
  );
  typia.assert(expiredResponse);
  // Test 4: Filter by status - revoked
  const revokedResponse = await api.functional.community.admin.api_keys.index(
    adminConnection,
    {
      body: {
        status: "revoked",
      } satisfies ICommunityApiKey.IRequest,
    },
  );
  typia.assert(revokedResponse);
  // Test 5: Pagination - limit 5, offset 0
  const firstPage = await api.functional.community.admin.api_keys.index(
    adminConnection,
    {
      body: {
        limit: 5,
        offset: 0,
      } satisfies ICommunityApiKey.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("first page limit", firstPage.data.length, 5);
  TestValidator.predicate(
    "first page pagination correct",
    () =>
      firstPage.pagination.limit === 5 && firstPage.pagination.current === 1,
  );
  // Test 6: Pagination - limit 5, offset 5
  const secondPage = await api.functional.community.admin.api_keys.index(
    adminConnection,
    {
      body: {
        limit: 5,
        offset: 5,
      } satisfies ICommunityApiKey.IRequest,
    },
  );
  typia.assert(secondPage);
  // We cannot validate any properties on ISummary because it's defined as an empty object {}
  // So we'll just test that the responses contain data arrays and pagination objects
  // Validate pagination works by ensuring the response has data and different pages
  // We'll check the length of data arrays and that the responses are not null
  TestValidator.predicate(
    "first page has data",
    () => firstPage.data.length > 0,
  );
  TestValidator.predicate(
    "second page has data",
    () => secondPage.data.length > 0,
  );
  // Validate pagination structure
  const response = await api.functional.community.admin.api_keys.index(
    adminConnection,
    {
      body: {} satisfies ICommunityApiKey.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.predicate("response has data array", () =>
    Array.isArray(response.data),
  );
  TestValidator.predicate(
    "response has pagination object",
    () => response.pagination && typeof response.pagination === "object",
  );
}
