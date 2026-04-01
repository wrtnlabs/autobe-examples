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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test super administrator retrieving an approved administrator promotion request.
 *
 * This test validates the complete administrator promotion request workflow:
 * 1. Super administrator joins and authenticates
 * 2. Customer account is created and authenticated
 * 3. Customer submits an administrator promotion request
 * 4. Super administrator approves the request
 * 5. Super administrator retrieves the approved request
 *
 * Validates that approved requests maintain proper status, rejection_reason is null,
 * actor_type is preserved, submitter information is correct, and timestamps are updated.
 */
export async function test_api_admin_promotion_request_retrieval_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins the system
  const superAdminJoin = await authorize_super_administrator_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  typia.assert(superAdminJoin);
  // Create super admin connection with authentication token
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: superAdminJoin.token.access,
    },
  };
  // 2. Create customer connection and join
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 3. Customer submits administrator promotion request
  const promotionRequest =
    await api.functional.shoppingMall.customer.admin_promotion_requests.create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 4. Super administrator approves the promotion request
  const approvedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.approve(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // 5. Super administrator retrieves the approved promotion request
  const retrievedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.at(
      superAdminConnection,
      {
        requestId: approvedRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Validations
  TestValidator.equals(
    "request id matches",
    retrievedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "status is approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "rejection_reason is null",
    retrievedRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "actor_type is customer",
    retrievedRequest.actor_type,
    "customer",
  );
  TestValidator.equals(
    "submitter id matches customer",
    retrievedRequest.submitter.id,
    customerJoin.id,
  );
  TestValidator.equals(
    "submitter email matches customer",
    retrievedRequest.submitter.email,
    customerJoin.email,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    () =>
      new Date(retrievedRequest.updated_at).getTime() >=
      new Date(retrievedRequest.created_at).getTime(),
  );
  TestValidator.predicate(
    "approval updated_at reflects approval time",
    () =>
      new Date(approvedRequest.updated_at).getTime() >=
      new Date(promotionRequest.created_at).getTime(),
  );
}
