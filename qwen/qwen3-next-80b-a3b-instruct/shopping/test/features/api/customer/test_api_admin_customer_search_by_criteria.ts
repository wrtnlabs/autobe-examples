import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_customer_search_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin via join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: "admin@example.com",
        password: "SecurePass123!",
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create test search criteria with multiple filters
  const searchCriteria: IShoppingMallCustomer.IRequest = {
    name: RandomGenerator.name(), // Random but valid name
    emailDomain: "company.com", // Filter by specific email domain
    registrationStartDate: new Date(2023, 0, 1).toISOString(),
    registrationEndDate: new Date(2023, 11, 31).toISOString(),
    accountStatus: "active", // Filter for active accounts
    membershipTier: "premium", // Filter for premium tier
    page: 1,
    limit: 5,
  } satisfies IShoppingMallCustomer.IRequest;
  // Step 3: Execute customer search with admin connection
  const searchResult: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(
      adminConnection, // Use admin-specific connection, not base connection
      { body: searchCriteria },
    );
  typia.assert(searchResult);
  // Step 4: Validate that response follows IPageIShoppingMallCustomer.ISummary format
  // This is already enforced by typia.assert(). Keep only basic structural verification.
  TestValidator.equals(
    "pagination structure",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 5);
  TestValidator.predicate("data array exists", searchResult.data.length >= 0);
  TestValidator.predicate(
    "pagination pages >= 1",
    searchResult.pagination.pages >= 1,
  );
  // Step 5: Verify that data array contains customer summary objects with correct structure
  // This is already covered by typia.assert(), but a basic presence check helps
  if (searchResult.data.length > 0) {
    const firstCustomer = searchResult.data[0];
    // Verify required summary properties are present (already enforced by typia.assert, just checking)
    TestValidator.equals(
      "customer.id exists",
      typeof firstCustomer.id,
      "string",
    );
    TestValidator.equals(
      "customer.name exists",
      typeof firstCustomer.name,
      "string",
    );
    TestValidator.equals(
      "customer.email exists",
      typeof firstCustomer.email,
      "string",
    );
    TestValidator.equals(
      "customer.account_status exists",
      typeof firstCustomer.account_status,
      "string",
    );
    TestValidator.equals(
      "customer.verified exists",
      typeof firstCustomer.verified,
      "boolean",
    );
  }
}
