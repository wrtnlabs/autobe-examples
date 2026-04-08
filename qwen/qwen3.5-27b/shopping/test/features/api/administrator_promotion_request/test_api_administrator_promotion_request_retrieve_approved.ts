import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequest";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_seller_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test retrieving an approved administrator promotion request to verify the processedByAdministrator field is populated.
 *
 * Validates the complete administrator promotion request approval workflow including seller registration, promotion request submission, administrator approval, and request retrieval. Ensures that approved requests correctly track which administrator processed the request for audit and accountability purposes.
 *
 * Special attention is given to verifying that the processedByAdministrator field is properly populated with the administrator's summary information after approval, and that the request status transitions correctly from pending to approved.
 *
 * 1. Register and authenticate as a seller with email and password.
 * 2. Seller submits an administrator promotion request with a justification reason.
 * 3. Register and authenticate as an administrator with email and password.
 * 4. Administrator approves the promotion request using the update endpoint.
 * 5. Retrieve the promotion request using its unique identifier.
 * 6. Validate that the response contains the correct requestId matching the created request.
 * 7. Validate that actor_type is 'seller' indicating the requestor's role.
 * 8. Validate that the reason matches what the seller originally submitted.
 * 9. Validate that status is 'approved' after administrator processing.
 * 10. Validate that rejected_reason is null since the request was approved.
 * 11. Validate that processedByAdministrator is populated with administrator summary.
 * 12. Validate that processedByAdministrator.grade is either 'regular' or 'super'.
 * 13. Validate that created_at timestamp is earlier than updated_at (approval time).
 * 14. Validate that deleted_at is null indicating the request is active.
 */
export async function test_api_administrator_promotion_request_retrieve_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Seller submits an administrator promotion request with a reason
  const requestReason = RandomGenerator.paragraph({ sentences: 3 });
  const promotionRequest =
    await generate_random_shopping_mall_seller_administrator_requests_create(
      sellerConnection,
      {
        body: {
          reason: requestReason,
        },
      },
    );
  typia.assert(promotionRequest);
  // 3. Register and authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 4. Administrator approves the promotion request
  const approvedRequest =
    await api.functional.shoppingMall.administrator.promotion_requests.update(
      adminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdministratorPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Retrieve the promotion request using its ID
  const retrievedRequest =
    await api.functional.shoppingMall.administrator.promotion_requests.at(
      adminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate that the response contains the correct requestId
  TestValidator.equals(
    "requestId matches",
    retrievedRequest.id,
    promotionRequest.id,
  );
  // 7. Validate that actor_type is 'seller'
  TestValidator.equals(
    "actor_type is seller",
    retrievedRequest.actor_type,
    "seller",
  );
  // 8. Validate that the reason matches what the seller submitted
  TestValidator.equals(
    "reason matches input",
    retrievedRequest.reason,
    requestReason,
  );
  // 9. Validate that status is 'approved'
  TestValidator.equals(
    "status is approved",
    retrievedRequest.status,
    "approved",
  );
  // 10. Validate that rejected_reason is null
  TestValidator.equals(
    "rejected_reason is null",
    retrievedRequest.rejected_reason,
    null,
  );
  // 11. Validate that processedByAdministrator is populated (not null)
  TestValidator.predicate(
    "processedByAdministrator exists",
    retrievedRequest.processedByAdministrator !== null &&
      retrievedRequest.processedByAdministrator !== undefined,
  );
  // Use assertGuard to narrow the type for subsequent checks
  typia.assertGuard(retrievedRequest.processedByAdministrator!);
  const adminSummary = retrievedRequest.processedByAdministrator!;
  // 12. Validate that processedByAdministrator.grade is either 'regular' or 'super'
  TestValidator.predicate(
    "admin grade is regular or super",
    adminSummary.grade === "regular" || adminSummary.grade === "super",
  );
  // 13. Validate that created_at is earlier than updated_at
  const createdAt = new Date(retrievedRequest.created_at).getTime();
  const updatedAt = new Date(retrievedRequest.updated_at).getTime();
  TestValidator.predicate(
    "created_at before updated_at",
    createdAt < updatedAt,
  );
  // 14. Validate that deleted_at is null
  TestValidator.equals("deleted_at is null", retrievedRequest.deleted_at, null);
}
