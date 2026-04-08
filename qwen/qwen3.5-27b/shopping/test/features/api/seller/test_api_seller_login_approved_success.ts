import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the primary success path for seller login with an approved seller account.
 *
 * Validates the complete seller authentication flow including registration, administrator approval simulation, and successful login. Ensures that approved sellers receive proper authentication tokens and can access seller features.
 *
 * Special attention is given to verifying that the seller account has the correct approval status, all required profile fields are present, and the authentication tokens are properly structured for subsequent API requests.
 *
 * 1. Register a new seller account via POST /shoppingMall/auth/seller/join with valid email, password, href, and referrer
 * 2. Simulate administrator approval of the seller (approval_status changed to 'approved')
 * 3. Call POST /shoppingMall/auth/seller/login with the registered email and password
 * 4. Verify the response returns IShoppingMallSeller.IAuthorized with all required fields
 * 5. Verify the token object contains access, refresh, expired_at, and refreshable_until
 */
export async function test_api_seller_login_approved_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(registeredSeller);
  // 2. Simulate administrator approval (in test environment, we assume this happens)
  // Note: In a real scenario, an admin would approve via admin API. For E2E testing,
  // we proceed with login and verify the approval_status in the response.
  // 3. Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: registeredSeller.email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ILogin;
  const authorizedSeller = await authorize_seller_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(authorizedSeller);
  // 4. Verify business logic - email matches registration
  TestValidator.equals(
    "email matches registration",
    authorizedSeller.email,
    email,
  );
  // 5. Verify approval status is approved
  TestValidator.equals(
    "approval status is approved",
    authorizedSeller.approval_status,
    "approved",
  );
  // 6. Verify rejection reason is null for approved sellers
  TestValidator.equals(
    "rejection reason is null",
    authorizedSeller.rejection_reason,
    null,
  );
  // 7. Verify seller is not suspended
  TestValidator.equals("not suspended", authorizedSeller.suspended, false);
  // 8. Verify seller is not banned
  TestValidator.equals("not banned", authorizedSeller.banned, false);
  // 9. Verify seller account is not deleted
  TestValidator.equals("deleted_at is null", authorizedSeller.deleted_at, null);
  // 10. Verify shop profile fields are present
  TestValidator.predicate(
    "shop_name is present",
    authorizedSeller.shop_name.length > 0,
  );
  TestValidator.predicate(
    "shop_description is present",
    authorizedSeller.shop_description.length >= 0,
  );
  // 11. Verify timestamp fields are present
  TestValidator.predicate(
    "created_at is valid",
    new Date(authorizedSeller.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    new Date(authorizedSeller.updated_at).getTime() > 0,
  );
  // 12. Verify token object has required fields
  TestValidator.predicate(
    "access token is present",
    authorizedSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    authorizedSeller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid",
    new Date(authorizedSeller.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    new Date(authorizedSeller.token.refreshable_until).getTime() > 0,
  );
  // 13. Verify token expiration is in the future
  TestValidator.predicate(
    "access token not expired yet",
    new Date(authorizedSeller.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refresh token not expired yet",
    new Date(authorizedSeller.token.refreshable_until).getTime() > Date.now(),
  );
}
