import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_admin_requests_create";
import { prepare_random_ecommerce_mall_seller_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_admin_request";

/**
 * Test seller can retrieve their own admin privilege request details.
 *
 * Validates the complete flow of a seller submitting an admin privilege request
 * and then successfully retrieving the request details by its ID. This test
 * ensures that the retrieval endpoint returns accurate information matching
 * the originally submitted request, including proper status tracking and
 * ownership verification.
 *
 * The test follows this flow:
 * 1. Register a new seller account with unique credentials
 * 2. Authenticate the seller to obtain valid JWT tokens
 * 3. Submit an admin privilege request with a detailed reason
 * 4. Retrieve the created request using the returned request ID
 * 5. Validate all fields match the submitted request data
 *
 * Key validations include:
 * - Request ID matches between creation and retrieval
 * - Reason text is preserved exactly as submitted
 * - Status is 'pending' for newly created requests
 * - Rejection reason is null (not yet reviewed)
 * - Seller information is correctly embedded
 * - Super admin review reference is null (not yet reviewed)
 * - Timestamps are present and valid
 * - Soft delete timestamp is null (active request)
 */
export async function test_api_seller_admin_request_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Authenticate the seller (seller is already logged in from join)
  // The authorize_seller_join already provides tokens in the connection
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: sellerConnection.headers,
  };
  // 3. Submit an admin privilege request with detailed reason
  const reasonText = RandomGenerator.paragraph({ sentences: 3 });
  const createdRequest =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.create(
      authenticatedConnection,
      {
        body: {
          reason: reasonText,
        },
      },
    );
  typia.assert(createdRequest);
  // Extract the requestId for retrieval test
  const requestId = createdRequest.id;
  // 4. Retrieve the admin request using the extracted requestId
  const retrievedRequest =
    await api.functional.ecommerceMall.seller.sellers.me.admin_requests.at(
      authenticatedConnection,
      {
        requestId: requestId,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate retrieved request matches the created request
  TestValidator.equals("request ID matches", retrievedRequest.id, requestId);
  TestValidator.equals("reason matches", retrievedRequest.reason, reasonText);
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "rejection reason is null",
    retrievedRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedRequest.seller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "reviewedBySuperAdmin is null",
    retrievedRequest.reviewedBySuperAdmin,
    null,
  );
  TestValidator.equals("deleted_at is null", retrievedRequest.deleted_at, null);
  TestValidator.predicate("created_at is valid timestamp", () => {
    const date = new Date(retrievedRequest.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid timestamp", () => {
    const date = new Date(retrievedRequest.updated_at);
    return !isNaN(date.getTime());
  });
}
