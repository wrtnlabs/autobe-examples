import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an administrator can search customer accounts by partial email match (ILIKE/contains).
 *
 * Validates the customer search endpoint by authenticating as an administrator and issuing search requests with various patterns. Since customer account creation is not available through the provided SDK functions, the test focuses on verifying the search endpoint's structural correctness, pagination metadata integrity, and behavior with both matching and non-matching search terms.
 *
 * Special attention is given to verifying that:
 * - The pagination structure (current, limit, records, pages) is always valid
 * - Search with a nonexistent pattern returns zero records with an empty data array
 * - The API accepts and processes various partial email search patterns
 * - All response data conforms to the expected type definitions via typia.assert()
 *
 * 1. Register a new administrator account with randomized credentials.
 * 2. Search customers by a common email domain pattern.
 * 3. Validate the pagination response structure.
 * 4. Search with a guaranteed nonexistent pattern and verify empty results.
 * 5. Search with no filter criteria and verify valid response structure.
 */
export async function test_api_administrator_customer_list_search_by_email(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // Step 2: Search customers by a domain pattern
  const domainResult =
    await api.functional.eCommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          search: "@example.com",
        } satisfies IECommerceMallCustomer.IRequest,
      },
    );
  typia.assert(domainResult);
  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination metadata is valid",
    () =>
      domainResult.pagination.current >= 0 &&
      domainResult.pagination.limit >= 0 &&
      domainResult.pagination.records >= 0 &&
      domainResult.pagination.pages >= 0,
  );
  // Step 4: Search with a guaranteed nonexistent pattern
  const emptyResult =
    await api.functional.eCommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          search: "NONEXISTENT_PATTERN_XYZ",
        } satisfies IECommerceMallCustomer.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Verify zero records and empty data for nonexistent search
  TestValidator.equals(
    "records is zero for nonexistent search",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "data array is empty for nonexistent search",
    emptyResult.data.length,
    0,
  );
  // Step 5: Search with no filter criteria (should return all customers with valid structure)
  const allResult =
    await api.functional.eCommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {} satisfies IECommerceMallCustomer.IRequest,
      },
    );
  typia.assert(allResult);
}
