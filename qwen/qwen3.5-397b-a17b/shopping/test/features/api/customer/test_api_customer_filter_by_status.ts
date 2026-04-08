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
 * Test administrator filtering customer accounts by status (active, banned, deleted).
 *
 * Validates the customer list filtering functionality by status parameter. Tests that administrators can retrieve customer accounts filtered by their account status (active, banned, deleted) and that the response correctly contains only customers matching the specified status.
 *
 * This test ensures administrative oversight capabilities for monitoring customer account states, including identifying banned accounts and tracking soft-deleted accounts for record-keeping purposes.
 *
 * 1. Administrator authenticates via join operation to obtain access token.
 * 2. Administrator requests customer list filtered by status='banned'.
 * 3. Validates all returned customers have status='banned'.
 * 4. Administrator requests customer list filtered by status='active'.
 * 5. Validates all returned customers have status='active'.
 * 6. Administrator requests customer list filtered by status='deleted'.
 * 7. Validates all returned customers have status='deleted'.
 * 8. Verifies pagination metadata is correctly structured for each request.
 */
export async function test_api_customer_filter_by_status(
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
  // 2. Test filtering by status='banned'
  const bannedResponse =
    await api.functional.shoppingMall.admin.customers.index(adminConnection, {
      body: {
        status: "banned",
      } satisfies IShoppingMallMember.IRequest,
    });
  typia.assert(bannedResponse);
  // 3. Validate all banned customers have correct status
  for (const customer of bannedResponse.data) {
    TestValidator.equals("banned customer status", customer.status, "banned");
  }
  // 4. Test filtering by status='active'
  const activeResponse =
    await api.functional.shoppingMall.admin.customers.index(adminConnection, {
      body: {
        status: "active",
      } satisfies IShoppingMallMember.IRequest,
    });
  typia.assert(activeResponse);
  // 5. Validate all active customers have correct status
  for (const customer of activeResponse.data) {
    TestValidator.equals("active customer status", customer.status, "active");
  }
  // 6. Test filtering by status='deleted'
  const deletedResponse =
    await api.functional.shoppingMall.admin.customers.index(adminConnection, {
      body: {
        status: "deleted",
      } satisfies IShoppingMallMember.IRequest,
    });
  typia.assert(deletedResponse);
  // 7. Validate all deleted customers have correct status
  for (const customer of deletedResponse.data) {
    TestValidator.equals("deleted customer status", customer.status, "deleted");
  }
  // 8. Validate pagination metadata structure
  TestValidator.predicate(
    "banned pagination current page >= 1",
    bannedResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "banned pagination limit >= 1",
    bannedResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "banned pagination records >= 0",
    bannedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "banned pagination pages >= 0",
    bannedResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "active pagination current page >= 1",
    activeResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "active pagination limit >= 1",
    activeResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "active pagination records >= 0",
    activeResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "active pagination pages >= 0",
    activeResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "deleted pagination current page >= 1",
    deletedResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "deleted pagination limit >= 1",
    deletedResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "deleted pagination records >= 0",
    deletedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "deleted pagination pages >= 0",
    deletedResponse.pagination.pages >= 0,
  );
  // 9. Validate data array length matches pagination records for single page
  if (bannedResponse.pagination.pages <= 1) {
    TestValidator.equals(
      "banned data length matches records",
      bannedResponse.data.length,
      bannedResponse.pagination.records,
    );
  }
  if (activeResponse.pagination.pages <= 1) {
    TestValidator.equals(
      "active data length matches records",
      activeResponse.data.length,
      activeResponse.pagination.records,
    );
  }
  if (deletedResponse.pagination.pages <= 1) {
    TestValidator.equals(
      "deleted data length matches records",
      deletedResponse.data.length,
      deletedResponse.pagination.records,
    );
  }
}
