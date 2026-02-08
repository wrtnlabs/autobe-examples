import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBannedUser";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test scenario: Administrator retrieves all banned users without filters, with default pagination.
 *
 * Validates:
 * - Admin authorization
 * - Unfiltered banned users retrieval
 * - Correct pagination metadata
 * - Complete banned user data structure
 */
export async function test_api_administrator_banned_users_retrieve_unfiltered_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator register and get authorized
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminJoinConnection, {
    body: {},
  });
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 2. Retrieve banned users with empty filter for unfiltered paginated list
  const output =
    await api.functional.shoppingMall.administrator.banned_users.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(output);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  // 4. Validate banned user data completeness using typia.assert above
  // No additional predicates per typia.assert coverage
}
