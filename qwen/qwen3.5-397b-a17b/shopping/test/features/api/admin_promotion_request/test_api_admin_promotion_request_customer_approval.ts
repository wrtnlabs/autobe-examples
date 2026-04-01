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
 * Test the successful approval of a pending administrator promotion request submitted by a customer.
 *
 * This test validates the complete workflow:
 * 1. Super administrator registration and authentication
 * 2. Customer registration and authentication
 * 3. Customer submits administrator promotion request
 * 4. Super administrator approves the request
 * 5. Verify status changes from 'pending' to 'approved'
 * 6. Verify customer account remains intact and can still login
 */
export async function test_api_admin_promotion_request_customer_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.IJoin;
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    { body: superAdminCredentials },
  );
  typia.assert(superAdminAuth);
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(customerAuth);
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
  // Validate initial state
  TestValidator.equals(
    "promotion request initial status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "rejection reason is null for pending request",
    promotionRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "submitter is the customer",
    (promotionRequest.submitter as IShoppingMallCustomer.ISummary).email,
    customerAuth.email,
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
  // 5. Validate approval results
  TestValidator.equals(
    "promotion request status changed to approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "rejection reason remains null after approval",
    approvedRequest.rejection_reason,
    null,
  );
  TestValidator.notEquals(
    "updated_at changed after approval",
    promotionRequest.updated_at,
    approvedRequest.updated_at,
  );
  // 6. Verify customer account still exists and is intact
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: customerCredentials.email,
      password: customerCredentials.password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customerLogin);
  TestValidator.equals(
    "customer can still login with original credentials",
    customerLogin.email,
    customerAuth.email,
  );
}
