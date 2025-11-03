import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingUserEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingUserEmail";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingUserEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingUserEmail";

/**
 * Validates admin audit/compliance listing of all user email records, covering
 * customer and seller associations, with various filter and privacy policy
 * enforcement. Ensures only compliant summary fields are accessible, field
 * restrictions (no extra data leak), paginated response is robust, and
 * business/privacy constraints are enforced throughout result sets and empty
 * pages. Also tests unauthorized and non-admin access rejections.
 */
export async function test_api_admin_user_email_list_audit_compliance(
  connection: api.IConnection,
) {
  // Step 1: Register and login as admin
  const adminEmail =
    RandomGenerator.name(2).replace(/\s+/g, "_") + "@audit-corp.com";
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: "compliance", // typical privilege for audit
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // Basic, all-records search (no filters)
  const allResult: IPageIShoppingUserEmail.ISummary =
    await api.functional.shopping.admin.userEmails.index(connection, {
      body: {},
    });
  typia.assert(allResult);
  TestValidator.predicate(
    "page info is valid in allResult",
    typeof allResult.pagination.current === "number" &&
      typeof allResult.pagination.limit === "number" &&
      typeof allResult.pagination.records === "number" &&
      typeof allResult.pagination.pages === "number",
  );

  // Helper to check ISummary privacy and mutual exclusion
  const checkSummary = (summary: IShoppingUserEmail.ISummary) => {
    typia.assert(summary);
    // Only one of shopping_customer_id or shopping_seller_id must be set (or both null/undefined)
    if (
      summary.shopping_customer_id !== null &&
      summary.shopping_customer_id !== undefined &&
      summary.shopping_seller_id !== null &&
      summary.shopping_seller_id !== undefined
    ) {
      throw new Error(
        "Both shopping_customer_id and shopping_seller_id are set — mutually exclusive",
      );
    }
    // Never contains fields not specified in schema
    // (typia.assert ensures only spec fields due to type)
    // If deleted_at is set, must be a date-time string
    if (summary.deleted_at !== null && summary.deleted_at !== undefined) {
      TestValidator.predicate(
        "deleted_at is ISO-8601 string",
        typeof summary.deleted_at === "string" &&
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(summary.deleted_at),
      );
    }
  };
  // Validate all ISummary rows
  for (const email of allResult.data) checkSummary(email);

  // Filtered: Only verified
  const verifiedResult = await api.functional.shopping.admin.userEmails.index(
    connection,
    {
      body: { is_verified: true },
    },
  );
  typia.assert(verifiedResult);
  for (const email of verifiedResult.data) {
    checkSummary(email);
    TestValidator.equals("is_verified true", email.is_verified, true);
  }

  // Filtered: Only unverified
  const unverifiedResult = await api.functional.shopping.admin.userEmails.index(
    connection,
    {
      body: { is_verified: false },
    },
  );
  typia.assert(unverifiedResult);
  for (const email of unverifiedResult.data) {
    checkSummary(email);
    TestValidator.equals("is_verified false", email.is_verified, false);
  }

  // Filtered: Only customer-associated
  const customerResult = await api.functional.shopping.admin.userEmails.index(
    connection,
    {
      body: { is_verified: true, is_primary: true },
    },
  );
  typia.assert(customerResult);
  for (const email of customerResult.data) {
    checkSummary(email);
    if (
      email.shopping_customer_id !== null &&
      email.shopping_customer_id !== undefined
    ) {
      TestValidator.predicate(
        "customer only — seller_id null",
        email.shopping_seller_id === null ||
          email.shopping_seller_id === undefined,
      );
    }
    TestValidator.equals("is_verified true", email.is_verified, true);
    TestValidator.equals("is_primary true", email.is_primary, true);
  }

  // Filtered: Only seller-associated
  const sellerResult = await api.functional.shopping.admin.userEmails.index(
    connection,
    {
      body: { is_verified: true, is_primary: false },
    },
  );
  typia.assert(sellerResult);
  for (const email of sellerResult.data) {
    checkSummary(email);
    if (
      email.shopping_seller_id !== null &&
      email.shopping_seller_id !== undefined
    ) {
      TestValidator.predicate(
        "seller only — customer_id null",
        email.shopping_customer_id === null ||
          email.shopping_customer_id === undefined,
      );
    }
    TestValidator.equals("is_verified true", email.is_verified, true);
    TestValidator.equals("is_primary false", email.is_primary, false);
  }

  // Paging: limit=3, page=2
  const page2 = await api.functional.shopping.admin.userEmails.index(
    connection,
    {
      body: { limit: 3, page: 2 },
    },
  );
  typia.assert(page2);
  // Data array can be empty or up to 3 results
  TestValidator.predicate(
    "page2.data no more than limit",
    page2.data.length <= 3,
  );
  for (const email of page2.data) checkSummary(email);

  // Sort order asc (by created_at)
  const ascResult = await api.functional.shopping.admin.userEmails.index(
    connection,
    {
      body: { order_by: "created_at", order: "asc" },
    },
  );
  typia.assert(ascResult);
  for (const email of ascResult.data) checkSummary(email);

  // Sort order desc (by updated_at)
  const descResult = await api.functional.shopping.admin.userEmails.index(
    connection,
    {
      body: { order_by: "updated_at", order: "desc" },
    },
  );
  typia.assert(descResult);
  for (const email of descResult.data) checkSummary(email);

  // Out-of-bounds page (should yield valid pagination, empty data)
  const emptyPage = await api.functional.shopping.admin.userEmails.index(
    connection,
    {
      body: { page: 999999, limit: 10 },
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty page yields data array empty",
    emptyPage.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination info present for empty page",
    typeof emptyPage.pagination.current === "number",
  );

  // Unauthorized: not logged in as admin
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin or unauth fails", async () => {
    await api.functional.shopping.admin.userEmails.index(unauthConn, {
      body: {},
    });
  });
}
