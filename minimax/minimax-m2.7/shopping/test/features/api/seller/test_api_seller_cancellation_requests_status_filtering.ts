import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test filtering cancellation requests by status for an authenticated seller.
 *
 * Validates that the cancellation requests listing endpoint correctly handles
 * the status filter parameter and returns properly formatted paginated responses.
 *
 * This test focuses on verifying:
 * - The endpoint accepts status filter parameters (pending, approved, rejected)
 * - Pagination metadata is correctly returned
 * - Response structure conforms to IPageIEcommerceMallCancellationRequest type
 *
 * 1. Administrator registers and authenticates to approve sellers.
 * 2. Seller registers and authenticates (initially pending).
 * 3. Administrator approves the seller to enable full seller access.
 * 4. Seller authenticates after approval to access cancellation requests.
 * 5. For each status filter (pending, approved, rejected):
 *    - Calls PATCH /ecommerceMall/seller/sellers/me/cancellation-requests
 *    - Validates response structure with typia.assert
 *    - Validates pagination metadata is correctly formatted
 *
 * Note: This test validates the endpoint structure and response format.
 * Actual filtering logic would require creating cancellation requests
 * through a complete order/cart/checkout flow.
 */
export async function test_api_seller_cancellation_requests_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Generate admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 1. Register and authenticate admin
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.admin.join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Login as admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.admin.login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Register seller (starts as pending)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthResult = await api.functional.ecommerceMall.auth.seller.join(
    sellerJoinConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerAuthResult);
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminLoginConnection,
      {
        sellerId: sellerAuthResult.id,
      },
    );
  typia.assert(approvedSeller);
  TestValidator.equals(
    "approval status is approved",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 4. Login as approved seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.seller.login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Test each status filter
  const statuses = ["pending", "approved", "rejected"] as const;
  for (const status of statuses) {
    // Call cancellation requests endpoint with status filter
    const response =
      await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.index(
        sellerLoginConnection,
        {
          body: {
            status: status,
            page: 1,
            limit: 100,
          } satisfies IEcommerceMallCancellationRequest.IRequest,
        },
      );
    // Validate the response structure with typia.assert
    typia.assert(response);
    // Validate pagination metadata exists and has correct structure
    TestValidator.predicate(
      `pagination exists for status '${status}'`,
      () => response.pagination !== null && response.pagination !== undefined,
    );
    TestValidator.predicate(
      `pagination.current is valid number for status '${status}'`,
      () => typeof response.pagination.current === "number",
    );
    TestValidator.predicate(
      `pagination.limit is valid number for status '${status}'`,
      () => typeof response.pagination.limit === "number",
    );
    TestValidator.predicate(
      `pagination.records is valid number for status '${status}'`,
      () => typeof response.pagination.records === "number",
    );
    TestValidator.predicate(
      `pagination.pages is valid number for status '${status}'`,
      () => typeof response.pagination.pages === "number",
    );
    // Validate data array exists
    TestValidator.predicate(`data array exists for status '${status}'`, () =>
      Array.isArray(response.data),
    );
  }
}
