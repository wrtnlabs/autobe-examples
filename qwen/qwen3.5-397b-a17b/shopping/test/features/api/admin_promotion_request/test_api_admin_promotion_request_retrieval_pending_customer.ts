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

export async function test_api_admin_promotion_request_retrieval_pending_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins the system
  const superAdminAuth = await authorize_super_administrator_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  typia.assert(superAdminAuth);
  // Create super administrator connection with authentication token
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${superAdminAuth.token.access}`,
    },
  };
  // 2. Customer account creation
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create customer connection with authentication token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customerAuth.token.access}`,
    },
  };
  // 3. Customer submits administrator promotion request
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const promotionRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: reason,
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 4. Super administrator retrieves the promotion request
  const retrievedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.at(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate response data
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "actor type is customer",
    retrievedRequest.actor_type,
    "customer",
  );
  TestValidator.equals(
    "reason matches submitted text",
    retrievedRequest.reason,
    reason,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "rejection reason is null",
    retrievedRequest.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedRequest.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedRequest.updated_at !== null,
  );
  TestValidator.equals("deleted_at is null", retrievedRequest.deleted_at, null);
  // Validate submitter is customer type with correct information
  TestValidator.equals(
    "submitter email matches customer",
    retrievedRequest.submitter.email,
    customerAuth.email,
  );
  // Type guard to verify submitter is customer (has profile property)
  if ("profile" in retrievedRequest.submitter) {
    TestValidator.predicate(
      "submitter has customer profile",
      retrievedRequest.submitter.profile !== null,
    );
    TestValidator.predicate(
      "submitter profile has display name",
      retrievedRequest.submitter.profile?.displayName !== undefined,
    );
    TestValidator.predicate(
      "submitter profile has phone number",
      retrievedRequest.submitter.profile?.phoneNumber !== undefined,
    );
  }
}
