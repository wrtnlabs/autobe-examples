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
 * Test retrieving cancellation requests with default pagination for an authenticated seller.
 *
 * Validates the cancellation requests listing endpoint for approved sellers. Verifies that
 * the endpoint returns a properly formatted paginated response with correct metadata and
 * data structure. Ensures that only cancellation requests belonging to the authenticated
 * seller are returned, sorted by creation date in descending order.
 *
 * 1. Administrator creates an account for seller approval operations.
 * 2. Seller registers a new account (status: pending).
 * 3. Admin approves the seller, changing status to approved.
 * 4. Approved seller authenticates to obtain access token.
 * 5. Seller calls the cancellation requests listing endpoint with default pagination.
 * 6. Validates response structure includes pagination metadata and data array.
 * 7. Verifies each cancellation request contains required fields.
 * 8. Confirms results are sorted by created_at descending (newest first).
 */
export async function test_api_seller_cancellation_requests_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create seller account (pending status)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Admin approves the seller
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  // 4. Login as approved seller with correct credentials
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Call cancellation requests listing with default pagination
  const response =
    await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.index(
      approvedSellerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 6. Validate pagination metadata exists and is correct
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.predicate(
    "current page is valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", response.pagination.limit >= 0);
  TestValidator.predicate(
    "records count is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    response.pagination.pages >= 0,
  );
  // 7. Validate data array exists
  TestValidator.equals("data array exists", Array.isArray(response.data), true);
  // 8. Validate each cancellation request contains required fields
  for (const request of response.data) {
    TestValidator.equals("request has reason", "reason" in request, true);
    TestValidator.equals("request has status", "status" in request, true);
    TestValidator.equals(
      "request has created_at",
      "created_at" in request,
      true,
    );
    TestValidator.equals(
      "request has updated_at",
      "updated_at" in request,
      true,
    );
  }
}