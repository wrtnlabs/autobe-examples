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
 * Test the successful approval of a pending administrator promotion request submitted by a seller.
 *
 * This test verifies the complete workflow:
 * 1. Super administrator registration and authentication
 * 2. Seller registration and authentication
 * 3. Seller submits administrator promotion request
 * 4. Super administrator approves the request
 * 5. Validates response status, timestamps, and approval metadata
 * 6. Verifies the seller account remains intact after approval
 */
export async function test_api_admin_promotion_request_seller_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate super administrator
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
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller submits administrator promotion request
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
    "submitter email matches",
    (promotionRequest.submitter as IShoppingMallSeller.ISummary).email,
    sellerEmail,
  );
  TestValidator.predicate(
    "rejection reason is null or undefined",
    promotionRequest.rejection_reason === null ||
      promotionRequest.rejection_reason === undefined,
  );
  // 4. Super administrator approves the promotion request
  const approvedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.approve(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // 5. Validate approval response
  TestValidator.equals(
    "status changed to approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "actor type remains seller",
    approvedRequest.actor_type,
    "seller",
  );
  TestValidator.predicate(
    "rejection reason still null or undefined",
    approvedRequest.rejection_reason === null ||
      approvedRequest.rejection_reason === undefined,
  );
  TestValidator.notEquals(
    "updated_at changed after approval",
    promotionRequest.updated_at,
    approvedRequest.updated_at,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(approvedRequest.updated_at) >=
      new Date(approvedRequest.created_at),
  );
  // 6. Verify seller account remains intact and can still login
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoginAuth);
  TestValidator.equals(
    "seller ID unchanged after approval",
    sellerAuth.id,
    sellerLoginAuth.id,
  );
}
