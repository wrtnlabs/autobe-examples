import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { generate_random_ecommerce_mall_seller_seller_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_admin_requests_create";
import { prepare_random_ecommerce_mall_seller_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_admin_request";

/**
 * Test that an authenticated seller can successfully submit an admin privilege request with a valid reason.
 *
 * Scenario:
 * 1. Register and authenticate as a seller using the join endpoint
 * 2. Submit a POST request to /seller/seller/admin-requests with a reason explaining why the seller needs admin access
 * 3. Verify that the response returns HTTP 201 Created with the created admin request object containing:
 *    - status='pending'
 *    - the provided reason
 *    - null values for reviewedBySuperAdmin and rejection_reason
 *    - a valid UUID id
 * 4. Verify the seller relationship is correctly populated in the response
 */
export async function test_api_seller_admin_request_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Step 2: Generate a random reason for admin request
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  // Step 3: Submit admin request using the generation utility function
  const adminRequest =
    await generate_random_ecommerce_mall_seller_seller_admin_requests_create(
      sellerConnection,
      {
        body: {
          reason: reason,
        },
      },
    );
  // Step 4: Validate the response with typia.assert
  typia.assert(adminRequest);
  // Step 5: Business logic validations using TestValidator
  TestValidator.equals("status is pending", adminRequest.status, "pending");
  TestValidator.equals("reason matches input", adminRequest.reason, reason);
  TestValidator.equals(
    "reviewedBySuperAdmin is null",
    adminRequest.reviewedBySuperAdmin,
    null,
  );
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      adminRequest.id,
    ),
  );
  TestValidator.equals(
    "seller is correctly populated",
    adminRequest.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "seller email matches",
    adminRequest.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "seller approval_status matches",
    adminRequest.seller.approval_status,
    seller.approval_status,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(adminRequest.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(adminRequest.updated_at)),
  );
  TestValidator.equals("deleted_at is null", adminRequest.deleted_at, null);
}
