import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test the success path where a super administrator rejects a pending administrator promotion request submitted by a seller.
 *
 * Test Steps:
 * 1. Super administrator joins and authenticates to the system
 * 2. Seller joins and authenticates to the system
 * 3. Seller submits an administrator promotion request with a valid reason
 * 4. Super administrator rejects the pending promotion request with a detailed rejection reason
 * 5. Verify the response contains the updated request with status='rejected'
 * 6. Verify the actor_type is 'seller' in the response
 * 7. Verify the submitter object contains seller information (id, email, approval_status)
 *
 * Business Logic Validations:
 * - Seller promotion requests can be rejected just like customer requests
 * - The actor_type field correctly identifies the submitter as 'seller'
 * - Rejection reason is recorded and visible
 * - Submitter polymorphic type resolves to seller summary
 *
 * Expected Outcome:
 * - Response contains actor_type='seller'
 * - Submitter object contains seller-specific fields
 * - Status equals 'rejected'
 * - Rejection_reason contains the provided text
 */
export async function test_api_admin_promotion_request_seller_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Seller setup
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller submits administrator promotion request
  const promotionRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // Validate initial request state
  TestValidator.equals(
    "actor_type is seller",
    promotionRequest.actor_type,
    "seller",
  );
  TestValidator.equals("status is pending", promotionRequest.status, "pending");
  TestValidator.predicate(
    "submitter is seller type",
    (promotionRequest.submitter as IShoppingMallSeller.ISummary)
      .approval_status !== undefined,
  );
  // 4. Super administrator rejects the promotion request
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.reject(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          reason: rejectionReason,
        } satisfies IShoppingMallAdminPromotionRequest.IReject,
      },
    );
  typia.assert(rejectedRequest);
  // 5. Verify rejection response
  TestValidator.equals(
    "request ID matches",
    rejectedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "actor_type is seller",
    rejectedRequest.actor_type,
    "seller",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "rejection_reason is not null",
    rejectedRequest.rejection_reason !== null,
  );
  TestValidator.notEquals(
    "updated_at changed after rejection",
    rejectedRequest.updated_at,
    promotionRequest.created_at,
  );
  // 6. Verify submitter contains seller information
  typia.assertGuard(rejectedRequest.submitter!);
  const submitter = rejectedRequest.submitter as IShoppingMallSeller.ISummary;
  TestValidator.equals(
    "submitter ID matches seller",
    submitter.id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "submitter has approval_status",
    submitter.approval_status !== undefined,
  );
  TestValidator.equals(
    "submitter approval_status is pending",
    submitter.approval_status,
    "pending",
  );
  TestValidator.equals(
    "submitter email matches",
    submitter.email,
    sellerEmail,
  );
}