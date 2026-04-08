import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator seller list retrieval with default pagination.
 *
 * Validates the complete seller list retrieval flow including administrator authentication and paginated seller data retrieval. Ensures that the response contains properly structured pagination metadata and seller summary data.
 *
 * Special attention is given to verifying that the pagination structure is correct with current page, limit, total records, and total pages. Each seller record must contain all required fields (id, email, approvalStatus, rejectionReason, createdAt, updatedAt) while excluding sensitive data like password_hash.
 *
 * 1. Administrator account is created and authenticated via /shoppingMall/auth/admin/join.
 * 2. Admin calls PATCH /shoppingMall/admin/sellers with default pagination parameters.
 * 3. Validates response structure matches IPageIShoppingMallSeller.ISummary.
 * 4. Validates pagination metadata contains current, limit, records, and pages fields.
 * 5. Validates each seller in data array contains required fields with correct types.
 * 6. Validates approvalStatus values are valid enum values (pending, approved, rejected).
 * 7. Validates rejectionReason is null for non-rejected sellers.
 */
export async function test_api_seller_list_admin_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve seller list with default pagination
  const result = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
        direction: "desc",
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination structure
  TestValidator.predicate("pagination exists", result.pagination !== undefined);
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate pagination consistency
  const expectedPages = Math.ceil(
    result.pagination.records / result.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    result.pagination.pages,
    expectedPages,
  );
  // 5. Validate business logic for each seller
  for (const seller of result.data) {
    // Business rule: rejectionReason must be null for non-rejected sellers
    if (seller.approvalStatus !== "rejected") {
      TestValidator.equals(
        "rejectionReason is null for non-rejected sellers",
        seller.rejectionReason,
        null,
      );
    }
  }
}
