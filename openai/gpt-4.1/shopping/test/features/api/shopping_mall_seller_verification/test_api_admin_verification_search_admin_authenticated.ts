import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerVerification";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerification";

/**
 * Test the ability of a newly registered admin to search and retrieve paginated
 * seller verification records, using filtering and pagination options.
 *
 * Validates that only admins can access this operation, including permission
 * checks, auditability, and response structure for dashboard integration. If
 * the seller has no verifications, ensures response is empty and paginated
 * properly. Checks status and compliance document filters as well as date
 * ranges and reviewer admin filters.
 */
export async function test_api_admin_verification_search_admin_authenticated(
  connection: api.IConnection,
) {
  // 1. Register new admin user and authenticate
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "#A1",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin token present",
    typeof adminAuth.token.access === "string" &&
      adminAuth.token.access.length > 0,
  );

  // 2. Search for verifications for a random sellerId (should have no records)
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  // No filter, default page/limit
  const emptyPage: IPageIShoppingMallSellerVerification.ISummary =
    await api.functional.shoppingMall.admin.sellers.verifications.index(
      connection,
      {
        sellerId,
        body: {} satisfies IShoppingMallSellerVerification.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty verifications data for new seller",
    emptyPage.data.length,
    0,
  );

  // 3. Try with additional filter combinations
  const filters: IShoppingMallSellerVerification.IRequest[] = [
    { status: "pending", page: 1, limit: 5 },
    {
      status: "approved",
      compliance_document_present: true,
      page: 1,
      limit: 10,
    },
    {
      reviewer_admin_id: adminAuth.id,
      sort_by: "created_at",
      sort_order: "desc",
    },
    {
      date_from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      date_to: new Date().toISOString(),
    },
  ];
  for (const filter of filters) {
    const page: IPageIShoppingMallSellerVerification.ISummary =
      await api.functional.shoppingMall.admin.sellers.verifications.index(
        connection,
        {
          sellerId,
          body: filter,
        },
      );
    typia.assert(page);
    TestValidator.equals(
      "filtered verifications is empty for new seller",
      page.data.length,
      0,
    );
  }
}
