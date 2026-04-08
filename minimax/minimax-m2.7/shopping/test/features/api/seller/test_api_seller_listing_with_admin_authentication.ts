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
 * Test administrator can retrieve paginated list of all seller accounts.
 *
 * Validates that an authenticated administrator can successfully access the seller listing endpoint and receive a properly formatted paginated response containing seller account information.
 *
 * The test workflow ensures proper admin authentication through the join endpoint, verifies authorization token handling, and validates the paginated response structure with all seller summary fields including identification, email, shop details, approval status, suspension status, and timestamps.
 *
 * 1. Register a new administrator account with unique email and secure password.
 * 2. Create an admin-specific connection with the returned authorization token.
 * 3. Call GET /ecommerceMall/admin/admin/sellers to retrieve the seller list.
 * 4. Validate response contains pagination metadata (current page, limit, total records, total pages).
 * 5. Validate each seller record structure matches IEcommerceMallSeller.ISummary schema.
 */
export async function test_api_seller_listing_with_admin_authentication(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // 2. Call the seller listing endpoint with admin authentication
  const sellerList =
    await api.functional.ecommerceMall.admin.admin.sellers.list(
      adminConnection,
    );
  typia.assert(sellerList);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination exists",
    sellerList.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination.current is non-negative",
    sellerList.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination.limit is non-negative",
    sellerList.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination.records is non-negative",
    sellerList.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination.pages is non-negative",
    sellerList.pagination.pages >= 0,
    true,
  );
  // 4. Validate data array exists
  TestValidator.equals(
    "data array exists",
    Array.isArray(sellerList.data),
    true,
  );
  // 5. If sellers exist, validate each record structure
  for (const seller of sellerList.data) {
    typia.assert(seller);
    // Validate required fields
    TestValidator.predicate("seller has valid id", seller.id.length > 0);
    TestValidator.predicate(
      "seller has valid email",
      seller.email.includes("@"),
    );
    TestValidator.predicate(
      "seller has approvalStatus",
      typeof seller.approvalStatus === "string",
    );
    TestValidator.predicate(
      "seller has suspensionStatus",
      typeof seller.suspensionStatus === "string",
    );
    TestValidator.predicate(
      "seller has createdAt",
      seller.createdAt.length > 0,
    );
    // Validate optional fields can be null or have values
    if (seller.shopName !== undefined && seller.shopName !== null) {
      TestValidator.predicate(
        "shopName is string when present",
        typeof seller.shopName === "string",
      );
    }
    if (
      seller.rejectionReason !== undefined &&
      seller.rejectionReason !== null
    ) {
      TestValidator.predicate(
        "rejectionReason is string when present",
        typeof seller.rejectionReason === "string",
      );
    }
    if (seller.rejectedAt !== undefined && seller.rejectedAt !== null) {
      TestValidator.predicate(
        "rejectedAt is string when present",
        typeof seller.rejectedAt === "string",
      );
    }
  }
}
