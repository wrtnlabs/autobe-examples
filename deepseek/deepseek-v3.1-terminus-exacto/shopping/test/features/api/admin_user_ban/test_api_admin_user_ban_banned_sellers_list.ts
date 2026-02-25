import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_admin_user_ban_banned_sellers_list(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Generate a valid adminUserBanId
  const adminUserBanId = typia.random<string & tags.Format<"uuid">>();
  // Test basic retrieval without filters
  const response =
    await api.functional.ecommerce.administrator.admin_user_bans.banned_sellers.index(
      adminConnection,
      {
        adminUserBanId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(response);
  // Test business logic: validate pagination structure
  TestValidator.equals(
    "pagination structure matches schema",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate seller data integrity
  TestValidator.equals("data is an array", Array.isArray(response.data), true);
  if (response.data.length > 0) {
    // Test business logic: first seller has expected fields
    const firstSeller = response.data[0];
    TestValidator.predicate(
      "first seller has non-empty shop name",
      firstSeller.shop_name.length > 0,
    );
  }
  // Test with search filter
  const searchResponse =
    await api.functional.ecommerce.administrator.admin_user_bans.banned_sellers.index(
      adminConnection,
      {
        adminUserBanId,
        body: {
          search: RandomGenerator.alphabets(3),
          page: 1,
          limit: 5,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Test pagination with different parameters
  const paginationTest =
    await api.functional.ecommerce.administrator.admin_user_bans.banned_sellers.index(
      adminConnection,
      {
        adminUserBanId,
        body: {
          page: 2,
          limit: 3,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Test with valid account_status filter from schema
  const statusResponse =
    await api.functional.ecommerce.administrator.admin_user_bans.banned_sellers.index(
      adminConnection,
      {
        adminUserBanId,
        body: {
          account_status: RandomGenerator.pick([
            "pending_approval",
            "approved",
            "rejected",
            "suspended",
            "active",
          ]) satisfies string as string,
          page: 1,
          limit: 10,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(statusResponse);
  // Test empty result scenario with impossible filters
  const emptyResponse =
    await api.functional.ecommerce.administrator.admin_user_bans.banned_sellers.index(
      adminConnection,
      {
        adminUserBanId,
        body: {
          search: "impossible_search_term_that_should_return_empty",
          page: 1,
          limit: 10,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.predicate(
    "empty search returns valid pagination",
    emptyResponse.pagination.records >= 0,
  );
}
