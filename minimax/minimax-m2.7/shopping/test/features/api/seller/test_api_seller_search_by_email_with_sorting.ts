import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test searching sellers by email pattern with custom sorting and pagination.
 *
 * Validates the admin seller search endpoint functionality including email pattern
 * matching, alphabetical sorting by email in ascending order, and pagination support.
 *
 * This test verifies that administrators can:
 * 1. Search for sellers by email pattern (case-insensitive partial match)
 * 2. Receive results sorted alphabetically by email address in ascending order
 * 3. Navigate through paginated results with configurable page size
 *
 * The search should return all sellers whose emails contain the specified pattern,
 * regardless of case (e.g., 'gmail' matches 'Seller@gmail.com', 'TEST@GMAIL.COM').
 *
 * 1. Register an administrator account using admin join endpoint.
 * 2. Search sellers with email pattern 'gmail' sorted by email ascending.
 * 3. Validate all returned sellers have emails containing the search pattern.
 * 4. Validate results are sorted alphabetically by email (ascending order).
 * 5. Validate pagination metadata shows correct page, limit, and total records.
 */
export async function test_api_seller_search_by_email_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Search sellers by email pattern with sorting
  const searchPattern = "gmail";
  const response = await api.functional.ecommerceMall.admin.admin.sellers.index(
    adminConnection,
    {
      body: {
        search: searchPattern,
        sortBy: "email",
        sortOrder: "asc",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate all returned sellers have emails containing the search pattern (case-insensitive)
  const lowerPattern = searchPattern.toLowerCase();
  for (const seller of response.data) {
    TestValidator.predicate(
      `seller email contains search pattern '${searchPattern}'`,
      seller.email.toLowerCase().includes(lowerPattern),
    );
  }
  // 4. Validate results are sorted alphabetically by email in ascending order
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        `seller[${i}] email is >= seller[${i - 1}] email (ascending sort)`,
        response.data[i].email.localeCompare(response.data[i - 1].email) >= 0,
      );
    }
  }
  // 5. Validate pagination metadata
  TestValidator.equals("page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
}
