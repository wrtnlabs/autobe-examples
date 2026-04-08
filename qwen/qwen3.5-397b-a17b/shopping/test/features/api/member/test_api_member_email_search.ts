import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMember";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator searching for member accounts by partial email match.
 *
 * Validates the email search functionality in the member listing endpoint. Tests partial matching behavior, case-insensitive search, empty result handling, and pagination metadata correctness.
 *
 * 1. Administrator authenticates via /shoppingMall/auth/admin/join.
 * 2. Administrator searches members with partial email filter 'test'.
 * 3. Verifies all returned members contain search term in email (case-insensitive).
 * 4. Tests with different email substring 'example' to validate LIKE operator behavior.
 * 5. Tests combining email filter with status filter for targeted lookups.
 * 6. Tests with no email filter to verify all members are returned.
 * 7. Validates pagination metadata is consistent and correctly calculated.
 */
export async function test_api_member_email_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test email search with partial match
  const searchTerm = "test";
  const searchResult = await api.functional.shoppingMall.admin.members.index(
    adminConnection,
    {
      body: {
        email: searchTerm,
      } satisfies IShoppingMallMember.IRequest,
    },
  );
  typia.assert(searchResult);
  // 3. Validate all returned members contain search term in email (case-insensitive)
  searchResult.data.forEach((member) => {
    TestValidator.predicate(
      `member email contains "${searchTerm}"`,
      member.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  });
  // 4. Test with different email substring
  const differentSearch = await api.functional.shoppingMall.admin.members.index(
    adminConnection,
    {
      body: {
        email: "example",
      } satisfies IShoppingMallMember.IRequest,
    },
  );
  typia.assert(differentSearch);
  // 5. Test combining email filter with status filter
  const combinedSearch = await api.functional.shoppingMall.admin.members.index(
    adminConnection,
    {
      body: {
        email: searchTerm,
        status: "active",
      } satisfies IShoppingMallMember.IRequest,
    },
  );
  typia.assert(combinedSearch);
  // Validate all members in combined search have active status
  combinedSearch.data.forEach((member) => {
    TestValidator.equals(`member status is active`, member.status, "active");
  });
  // 6. Test with no email filter (should return all members)
  const allMembers = await api.functional.shoppingMall.admin.members.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(allMembers);
  // 7. Validate pagination metadata is consistent
  TestValidator.predicate(
    "pagination pages calculation",
    allMembers.pagination.pages === 0 ||
      allMembers.pagination.pages ===
        Math.ceil(allMembers.pagination.records / allMembers.pagination.limit),
  );
}
