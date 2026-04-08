import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieval of all post-purchase cancellation requests with pagination.
 *
 * Validates that administrators can access all cancellation requests across the platform regardless of customer or seller ownership. The test verifies the complete response structure including pagination metadata, cancellation request details, and nested entity information (member, orderItem, seller).
 *
 * The test ensures that the admin endpoint provides proper data isolation bypass, allowing administrators to oversee all cancellation requests for platform-wide monitoring and management purposes.
 *
 * 1. Administrator account is created and authenticated via promotion workflow.
 * 2. Admin calls the cancellation requests list endpoint with pagination parameters.
 * 3. Response structure is validated against IPageIShoppingMallPostPurchaseCancellationRequest.ISummary.
 * 4. Pagination metadata is verified for correctness (current page, limit, total records, total pages).
 * 5. Each cancellation request record is validated for required fields and nested entity structure.
 * 6. Member information is verified to include customer profile with display_name.
 * 7. OrderItem is validated to include product, productVariant, seller, and shipment information.
 * 8. Sorting order is verified to be by created_at DESC, then id DESC.
 */
export async function test_api_post_purchase_cancellation_request_admin_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Call admin cancellation requests list endpoint with pagination
  const response =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: ["-created_at", "-id"],
        } satisfies IShoppingMallPostPurchaseCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate response structure - data array exists
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 5. Validate sorting order (created_at DESC, then id DESC)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = response.data[i];
      const next = response.data[i + 1];
      const currentCreatedAt = new Date(current.created_at).getTime();
      const nextCreatedAt = new Date(next.created_at).getTime();
      TestValidator.predicate(
        "results sorted by created_at DESC",
        currentCreatedAt >= nextCreatedAt,
      );
      // If created_at is equal, verify id ordering
      if (currentCreatedAt === nextCreatedAt) {
        TestValidator.predicate(
          "results sorted by id DESC when created_at equal",
          current.id >= next.id,
        );
      }
    }
  }
}
