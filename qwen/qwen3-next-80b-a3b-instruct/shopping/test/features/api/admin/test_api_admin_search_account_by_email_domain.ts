import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_search_account_by_email_domain(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate with a test email domain
  const adminConnection: api.IConnection = { host: connection.host };
  const testEmail = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const password = RandomGenerator.alphaNumeric(16);
  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: testEmail,
        password,
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(createdAdmin);
  // Step 2: Verify the created admin has the expected email domain
  TestValidator.equals(
    "created admin email domain matches",
    createdAdmin.email,
    testEmail,
  );
  // Step 3: Create a new connection to perform the search as the created admin
  const searchConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(searchConnection, {
    body: {
      email: testEmail,
      password,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Step 4: Perform search for admin accounts with the exact email address we created
  const searchRequest: IShoppingMallAdmin.IRequest = {
    q: testEmail, // Search for exact email address (ensures domain matching)
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAdmin.IRequest;
  const searchResult: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(searchConnection, {
      body: searchRequest,
    });
  typia.assert(searchResult);
  // Step 5: Verify the search result contains exactly the created admin account
  const foundAdmins = searchResult.data;
  TestValidator.predicate(
    "search returned at least one result",
    foundAdmins.length > 0,
  );
  const matchedAdmin = foundAdmins.find((admin) => admin.email === testEmail);
  TestValidator.predicate(
    "created admin found in search results",
    matchedAdmin !== undefined,
  );
  // Step 6: Verify the returned admin data exactly matches the created admin's public data
  if (matchedAdmin) {
    TestValidator.equals("admin username matches", matchedAdmin.username, ""); // Empty string as default
    TestValidator.equals("admin email matches", matchedAdmin.email, testEmail);
    TestValidator.equals(
      "admin active status is true",
      matchedAdmin.is_active,
      true,
    );
    // department and title are optional and may be empty strings
    TestValidator.predicate(
      "admin department is string",
      typeof matchedAdmin.department === "string",
    );
    TestValidator.predicate(
      "admin title is string",
      typeof matchedAdmin.title === "string",
    );
  }
  // Step 7: Verify pagination metadata is correct
  TestValidator.equals(
    "pagination page matches",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records matches",
    searchResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages matches",
    searchResult.pagination.pages,
    1,
  );
  // Step 8: Test unauthorized access - should fail
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.shoppingMall.admin.admins.index(
      unauthorizedConnection,
      {
        body: {
          q: testEmail,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
  });
}
