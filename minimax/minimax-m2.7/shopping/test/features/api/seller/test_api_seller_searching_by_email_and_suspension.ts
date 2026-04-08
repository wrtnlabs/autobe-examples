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
 * Test admin seller search functionality filtering by email pattern and suspension status.
 *
 * Validates that administrators can search and filter sellers using email pattern matching
 * and suspension status filters. The test verifies case-insensitive partial email matching
 * works correctly, suspension status filtering returns only matching sellers, and combined
 * filters narrow results appropriately.
 *
 * **Search Capabilities:**
 * - Email pattern matching (case-insensitive, partial match)
 * - Suspension status filtering (active, suspended)
 * - Combined filters work together to narrow results
 *
 * 1. Administrator authenticates via admin join endpoint.
 * 2. Admin searches for sellers with email containing 'gmail.com' and suspensionStatus 'suspended'.
 * 3. Verify response contains only sellers matching both criteria.
 * 4. Admin searches with email pattern 'test' and suspensionStatus 'active'.
 * 5. Verify response contains only active sellers with 'test' in their email.
 * 6. Validate that case-insensitive email matching works correctly.
 */
export async function test_api_seller_searching_by_email_and_suspension(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      name: RandomGenerator.name(),
      href: "https://admin.example.com/sellers",
      referrer: "https://admin.example.com/",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Search for sellers with email containing 'gmail.com' and 'suspended' status
  const suspendedGmailResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        search: "gmail.com",
        suspensionStatus: "suspended",
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(suspendedGmailResponse);
  // Verify all returned sellers match both criteria
  TestValidator.equals(
    "pagination structure exists",
    suspendedGmailResponse.pagination !== null,
    true,
  );
  for (const seller of suspendedGmailResponse.data) {
    TestValidator.equals(
      "seller email contains gmail.com (case-insensitive)",
      seller.email.toLowerCase().includes("gmail.com"),
      true,
    );
    TestValidator.equals(
      "seller suspension status is suspended",
      seller.suspensionStatus,
      "suspended",
    );
  }
  // 3. Search for sellers with email containing 'test' and 'active' status
  const activeTestResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        search: "test",
        suspensionStatus: "active",
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(activeTestResponse);
  // Verify all returned sellers match both criteria
  TestValidator.equals(
    "pagination structure exists",
    activeTestResponse.pagination !== null,
    true,
  );
  for (const seller of activeTestResponse.data) {
    TestValidator.equals(
      "seller email contains test (case-insensitive)",
      seller.email.toLowerCase().includes("test"),
      true,
    );
    TestValidator.equals(
      "seller suspension status is active",
      seller.suspensionStatus,
      "active",
    );
  }
  // 4. Test case-insensitive email matching with uppercase pattern
  const uppercaseSearchResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        search: "GMAIL.COM",
        suspensionStatus: "active",
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(uppercaseSearchResponse);
  // Verify case-insensitive matching works (should find same results as lowercase)
  for (const seller of uppercaseSearchResponse.data) {
    TestValidator.equals(
      "seller email contains gmail.com regardless of case",
      seller.email.toLowerCase().includes("gmail.com"),
      true,
    );
    TestValidator.equals(
      "seller suspension status is active",
      seller.suspensionStatus,
      "active",
    );
  }
  // 5. Test with only email filter (no suspension status)
  const emailOnlyResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        search: "seller",
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(emailOnlyResponse);
  // Verify all returned sellers have 'seller' in email (case-insensitive)
  TestValidator.equals(
    "pagination structure exists",
    emailOnlyResponse.pagination !== null,
    true,
  );
  for (const seller of emailOnlyResponse.data) {
    TestValidator.equals(
      "seller email contains seller (case-insensitive)",
      seller.email.toLowerCase().includes("seller"),
      true,
    );
  }
  // 6. Test with only suspension status filter (no email pattern)
  const statusOnlyResponse =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        suspensionStatus: "active",
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(statusOnlyResponse);
  // Verify all returned sellers have active suspension status
  TestValidator.equals(
    "pagination structure exists",
    statusOnlyResponse.pagination !== null,
    true,
  );
  for (const seller of statusOnlyResponse.data) {
    TestValidator.equals(
      "seller suspension status is active",
      seller.suspensionStatus,
      "active",
    );
  }
}
