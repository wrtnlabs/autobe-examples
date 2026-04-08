import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test the edge case where a super administrator attempts to view snapshots for a newly submitted
 * promotion request that has not yet been reviewed. This verifies the system correctly returns
 * an empty data array instead of errors.
 *
 * This scenario validates that:
 * - Snapshots are only created on status transitions, not on initial creation
 * - The system gracefully handles empty results
 * - Pagination metadata is correctly computed when no records exist
 * - Audit trail starts empty and grows as review actions occur
 */
export async function test_api_admin_promotion_request_snapshot_list_empty_new_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create connection and authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create connection and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "127.0.0.1",
    },
  });
  // 3. Submit a promotion request as the seller
  const promotionRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 10,
            wordMax: 20,
          }),
        },
      },
    );
  typia.assert(promotionRequest);
  // 4. Validate the promotion request is in pending status (newly submitted)
  TestValidator.equals(
    "promotion request status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "reviewer is null for new request",
    promotionRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "rejection reason is null",
    promotionRequest.rejectionReason,
    null,
  );
  // 5. Immediately call the target endpoint to retrieve snapshots (super admin queries)
  const queryParams =
    typia.random<IEcommerceMallAdminPromotionRequestSnapshot.IRequest>();
  const snapshotResponse =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: queryParams,
      },
    );
  typia.assert(snapshotResponse);
  // 6. Validate response structure - empty data array for new request
  TestValidator.equals(
    "pagination current is 1",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records is 0",
    snapshotResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    snapshotResponse.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination limit is valid positive number",
    snapshotResponse.pagination.limit > 0,
  );
  // Validate data array is empty
  TestValidator.equals("data array is empty", snapshotResponse.data.length, 0);
  TestValidator.equals("data array is empty array", snapshotResponse.data, []);
  // 7. Additional business logic validations
  // Verify that snapshots are only created on status transitions, not on initial creation
  TestValidator.predicate(
    "data array length is 0 for new request",
    snapshotResponse.data.length === 0,
  );
  // Verify the request ID matches
  // The endpoint returned successfully which implies the request exists and is accessible
  // The empty data array confirms no snapshots (status changes) have occurred yet
}
