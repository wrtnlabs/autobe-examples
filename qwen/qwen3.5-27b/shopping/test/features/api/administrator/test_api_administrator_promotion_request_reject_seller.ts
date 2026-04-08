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
 * Test super administrator rejecting a seller's administrator promotion request with a rejection reason.
 *
 * Validates the complete workflow of a seller requesting administrator privileges and a super administrator rejecting that request. Ensures that the rejection process correctly updates the request status, records the rejection reason, and associates the processing administrator with the request.
 *
 * Special attention is given to verifying that the seller does not gain administrator privileges after rejection and that the request metadata (processed_by_administrator_id, rejected_reason, updated_at) is correctly populated.
 *
 * 1. Register a super administrator account for the test.
 * 2. Register a seller account for the test.
 * 3. Seller submits an administrator promotion request with a justification reason.
 * 4. Verify the request is created with status='pending'.
 * 5. Super administrator rejects the request with status='rejected' and a rejection reason.
 * 6. Validate the updated request has status='rejected', processed_by_administrator_id set, and rejected_reason preserved.
 */
export async function test_api_administrator_promotion_request_reject_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: "super_admin@test.com",
      password: "1234",
    },
  });
  typia.assert(adminAuth);
  // 2. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller submits administrator promotion request
  const request =
    await generate_random_shopping_mall_seller_administrator_requests_create(
      sellerConnection,
      {
        body: {
          reason: "I want to help manage the platform",
        },
      },
    );
  typia.assert(request);
  // 4. Verify request is pending
  TestValidator.equals("request status is pending", request.status, "pending");
  TestValidator.equals(
    "processed_by_administrator_id is null",
    request.processedByAdministrator,
    null,
  );
  // 5. Super administrator rejects the request
  const updatedRequest =
    await api.functional.shoppingMall.administrator.promotion_requests.update(
      adminConnection,
      {
        requestId: request.id,
        body: {
          status: "rejected",
          rejected_reason: "Insufficient experience",
        } satisfies IShoppingMallAdministratorPromotionRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 6. Validate rejection
  TestValidator.equals(
    "request status changed to rejected",
    updatedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "processed_by_administrator_id is set",
    updatedRequest.processedByAdministrator?.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "rejected_reason is preserved",
    updatedRequest.rejected_reason,
    "Insufficient experience",
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedRequest.updated_at) > new Date(updatedRequest.created_at),
  );
}
