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
 * Test super administrator retrieving a rejected administrator promotion request submitted by a seller.
 *
 * Workflow:
 * 1. Super administrator joins and authenticates
 * 2. Seller account is created and authenticated
 * 3. Seller submits an administrator promotion request with a reason
 * 4. Super administrator rejects the request with a rejection reason
 * 5. Super administrator retrieves the rejected promotion request
 *
 * Validations:
 * - Status is 'rejected'
 * - rejection_reason contains the provided rejection explanation
 * - actor_type is 'seller'
 * - submitter object contains seller information (id, email, approval_status)
 * - reason matches original submission
 * - updated_at reflects the rejection timestamp
 */
export async function test_api_admin_promotion_request_retrieval_rejected_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins and authenticates
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Seller account is created and authenticated
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller submits an administrator promotion request
  const promotionReason = RandomGenerator.paragraph({ sentences: 3 });
  const promotionRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: promotionReason,
        },
      },
    );
  typia.assert(promotionRequest);
  // Validate initial request state
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "actor type is seller",
    promotionRequest.actor_type,
    "seller",
  );
  TestValidator.equals(
    "reason matches submission",
    promotionRequest.reason,
    promotionReason,
  );
  TestValidator.predicate(
    "submitter is seller with id",
    () =>
      "id" in promotionRequest.submitter &&
      promotionRequest.submitter.id !== undefined,
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
  // 5. Super administrator retrieves the rejected promotion request
  const retrievedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.at(
      superAdminConnection,
      {
        requestId: rejectedRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Validate rejection was properly recorded
  TestValidator.equals(
    "status is rejected",
    retrievedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    retrievedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.equals(
    "actor type remains seller",
    retrievedRequest.actor_type,
    "seller",
  );
  TestValidator.equals(
    "reason matches original submission",
    retrievedRequest.reason,
    promotionReason,
  );
  TestValidator.predicate(
    "submitter has seller id",
    () =>
      "id" in retrievedRequest.submitter &&
      typeof retrievedRequest.submitter.id === "string",
  );
  TestValidator.predicate(
    "submitter has seller email",
    () =>
      "email" in retrievedRequest.submitter &&
      typeof retrievedRequest.submitter.email === "string",
  );
  TestValidator.predicate(
    "submitter has approval_status",
    () =>
      "approval_status" in retrievedRequest.submitter &&
      ["pending", "approved", "rejected"].includes(
        retrievedRequest.submitter.approval_status,
      ),
  );
  TestValidator.predicate(
    "updated_at is after creation",
    () =>
      new Date(retrievedRequest.updated_at).getTime() >=
      new Date(retrievedRequest.created_at).getTime(),
  );
}
