import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test seller administrator promotion request submission workflow.
 *
 * Validates the complete promotion request submission flow for sellers seeking administrator privileges. The test ensures that authenticated sellers can successfully submit promotion requests with valid reason text, and that the system correctly processes the request with appropriate status and metadata.
 *
 * The test verifies that the promotion request is created with 'pending' status, correct actor_type determined from the authenticated seller account, and that all required fields are properly populated including timestamps and UUID identifier.
 *
 * 1. Seller registers and authenticates via join operation.
 * 2. Seller submits administrator promotion request with reason text.
 * 3. Validates promotion request entity contains correct status, actor_type, reason, and null fields for unreviewed request.
 * 4. Validates deleted_at is null indicating active record.
 */
export async function test_api_admin_promotion_request_seller_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Submit administrator promotion request
  const reasonText = RandomGenerator.paragraph({ sentences: 3 });
  const promotionRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: reasonText,
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 3. Validate promotion request entity
  TestValidator.equals("status is pending", promotionRequest.status, "pending");
  TestValidator.equals(
    "actor_type is seller",
    promotionRequest.actor_type,
    "seller",
  );
  TestValidator.equals(
    "reason matches input",
    promotionRequest.reason,
    reasonText,
  );
  TestValidator.equals(
    "rejection_note is null",
    promotionRequest.rejection_note,
    null,
  );
  TestValidator.equals("reviewer is null", promotionRequest.reviewer, null);
  TestValidator.equals("deleted_at is null", promotionRequest.deleted_at, null);
}
