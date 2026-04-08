import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test listing active super administrator accounts with default pagination.
 *
 * Validates that an authenticated super administrator can successfully retrieve
 * a paginated list of all active super admin accounts. This test verifies the
 * listing endpoint returns proper pagination metadata and that all returned
 * accounts have the required summary fields. It also confirms that only active
 * accounts (isDeleted: false) are returned by default when no filters are
 * specified.
 *
 * The test creates a super admin account, then queries the listing endpoint
 * with an empty request body to use default filters (active status only,
 * sorted by createdAt descending). It validates the complete response structure
 * including pagination metadata and account summary details.
 *
 * 1. Create a super admin account via registration endpoint.
 * 2. Send PATCH request to listing endpoint with empty body for default filters.
 * 3. Validate HTTP 200 response with valid pagination structure.
 * 4. Verify data array contains at least the created account.
 * 5. Confirm all returned accounts have required fields and isDeleted: false.
 */
export async function test_api_super_admin_list_active_accounts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(authorized);
  // 2. Call the listing endpoint with empty body (default filters: active only, sorted by createdAt desc)
  const response: IPageIEcommerceMallSuperAdmin.ISummary =
    await api.functional.ecommerceMall.superAdmin.super_admin.super_admins.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  // 3. Validate the response structure
  typia.assert(response);
  // 4. Validate pagination metadata exists and is valid
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.predicate(
    "current page is valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    response.pagination.pages >= 0,
  );
  // 5. Validate data array exists and contains at least the created account
  TestValidator.equals("data array exists", Array.isArray(response.data), true);
  TestValidator.predicate(
    "contains at least one account",
    response.data.length > 0,
  );
  TestValidator.predicate(
    "contains created account",
    response.data.some((account) => account.id === authorized.id),
  );
  // 6. Validate each account has required fields
  for (const account of response.data) {
    typia.assert(account);
    // Verify required summary fields exist
    TestValidator.predicate(
      "account has valid UUID id",
      /^[0-9a-f-]{36}$/i.test(account.id),
    );
    TestValidator.equals(
      "account has email",
      typeof account.email === "string",
      true,
    );
    TestValidator.equals(
      "account has createdAt",
      typeof account.createdAt === "string",
      true,
    );
    TestValidator.equals(
      "account has updatedAt",
      typeof account.updatedAt === "string",
      true,
    );
    TestValidator.equals(
      "account has isDeleted boolean",
      typeof account.isDeleted === "boolean",
      true,
    );
    // Verify only active accounts are returned by default
    TestValidator.equals(
      "account is active (not deleted)",
      account.isDeleted,
      false,
    );
  }
}
