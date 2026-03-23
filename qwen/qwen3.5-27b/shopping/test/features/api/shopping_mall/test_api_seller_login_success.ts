import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the primary success path for seller login authentication.
 *
 * This test verifies that an approved seller can successfully login to the
 * shopping mall platform. It includes the complete workflow of:
 * 1. Admin registration and login
 * 2. Seller registration (creates pending approval request)
 * 3. Admin approval of seller application
 * 4. Seller login with valid credentials
 * 5. Validation of authorization response containing seller identity and JWT tokens
 */
export async function test_api_seller_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration - creates pending approval request
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // 3. Approve the seller application
  // Note: In a complete system, there would be a GET endpoint to list approval requests.
  // For this test, we assume the approval request ID matches the seller ID.
  const approvalRequestId = sellerJoinResult.id;
  await api.functional.shoppingMall.admin.sellerApprovalRequests.update(
    adminConnection,
    {
      requestId: approvalRequestId,
      body: {
        status: "approved",
      } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
    },
  );
  // 4. Seller login with valid credentials
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoginResult = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: loginBody,
    },
  );
  typia.assert(sellerLoginResult);
  // 5. Validate authorization response
  TestValidator.equals(
    "seller ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sellerLoginResult.id,
    ),
    true,
  );
  TestValidator.equals(
    "seller email matches input",
    sellerLoginResult.email,
    sellerEmail,
  );
  TestValidator.predicate(
    "shop name exists and has minimum length",
    sellerLoginResult.shop_name.length >= 2,
  );
  TestValidator.equals(
    "approval status is approved",
    sellerLoginResult.approval_status,
    "approved",
  );
  TestValidator.equals(
    "account status is active",
    sellerLoginResult.status,
    "active",
  );
  TestValidator.predicate(
    "access token exists and is non-empty",
    sellerLoginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists and is non-empty",
    sellerLoginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO 8601 datetime",
    !isNaN(Date.parse(sellerLoginResult.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 datetime",
    !isNaN(Date.parse(sellerLoginResult.token.refreshable_until)),
  );
  // Validate that the connection was updated with the authorization token
  TestValidator.predicate(
    "connection has authorization header",
    sellerLoginConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access token",
    sellerLoginConnection.headers?.Authorization,
    sellerLoginResult.token.access,
  );
}
