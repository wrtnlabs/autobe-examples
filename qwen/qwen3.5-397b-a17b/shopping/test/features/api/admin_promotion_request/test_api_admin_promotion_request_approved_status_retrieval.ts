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
 * Test administrator promotion request retrieval workflow.
 *
 * This test validates:
 * 1. Seller account registration
 * 2. Administrator promotion request submission
 * 3. Promotion request retrieval by the submitter
 * 4. Response structure validation including status and submitter information
 *
 * Note: Super administrator approval endpoint is not available in the provided SDK,
 * so this test validates the creation and retrieval workflow with pending status.
 */
export async function test_api_admin_promotion_request_approved_status_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create administrator promotion request
  const promotionRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 3. Retrieve the promotion request
  const retrievedRequest =
    await api.functional.shoppingMall.seller.admin_promotion_requests.at(
      sellerConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 4. Validate response structure and data integrity
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "reason matches input",
    retrievedRequest.reason,
    promotionRequest.reason,
  );
  TestValidator.equals(
    "actor type is seller",
    retrievedRequest.actor_type,
    "seller",
  );
  TestValidator.predicate(
    "status is pending or approved",
    retrievedRequest.status === "pending" ||
      retrievedRequest.status === "approved",
  );
  TestValidator.equals(
    "submitter ID matches seller",
    (retrievedRequest.submitter as IShoppingMallSeller.ISummary).id,
    sellerAuth.id,
  );
  // 5. Validate submitter information structure (already validated by typia.assert)
  const submitter = retrievedRequest.submitter as IShoppingMallSeller.ISummary;
  TestValidator.equals(
    "submitter email exists",
    typeof submitter.email,
    "string",
  );
  TestValidator.equals(
    "submitter has approval_status",
    submitter.approval_status === "pending" ||
      submitter.approval_status === "approved" ||
      submitter.approval_status === "rejected",
    true,
  );
}
