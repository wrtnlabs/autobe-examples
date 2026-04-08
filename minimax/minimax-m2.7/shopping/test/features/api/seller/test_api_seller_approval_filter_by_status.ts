import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can filter their approval records by status.
 *
 * Validates the status filtering business logic for the seller's approval history.
 * When a new seller registers, they have a pending approval record. This test verifies
 * that filtering by different status values correctly returns the appropriate records:
 * 1. Filtering by 'pending' status returns the seller's pending approval record.
 * 2. Filtering by 'approved' status returns empty results when no approved records exist.
 *
 * 1. Register a new seller via /auth/seller/join to create a pending approval record.
 * 2. Create seller-specific connection with the auth token.
 * 3. Call the target endpoint with status='pending' and validate pending records are returned.
 * 4. Call the target endpoint with status='approved' and validate empty results.
 */
export async function test_api_seller_approval_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller to create a pending approval record
  const authorized = await api.functional.ecommerceMall.auth.seller.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Create seller-specific connection with auth token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: authorized.token.access };
  // 3. Filter by 'pending' status - should return the seller's pending approval
  const pendingResult =
    await api.functional.ecommerceMall.seller.sellers.me.approvals.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(pendingResult);
  // 3.1 Validate pending records are returned (newly registered seller has pending approval)
  TestValidator.equals(
    "has pending approval records",
    pendingResult.data.length > 0,
    true,
  );
  TestValidator.equals(
    "pending record status is 'pending'",
    pendingResult.data[0].status,
    "pending",
  );
  // 4. Filter by 'approved' status - should return empty (no approved records yet)
  const approvedResult =
    await api.functional.ecommerceMall.seller.sellers.me.approvals.index(
      sellerConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvedResult);
  // 4.1 Validate no approved records returned
  TestValidator.equals(
    "no approved approval records",
    approvedResult.data.length,
    0,
  );
}
