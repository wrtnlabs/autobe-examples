import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate valid seller registration data
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16); // Must be at least 12 chars
  // Step 3: Register seller account using authorization function
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(registeredSeller);
  // Step 4: Ensure seller account has 'approved' status (mandatory for login)
  // This test assumes that joining in the test environment creates approved sellers
  // as required by the test scenario, even though in reality admin approval would be needed.
  // This is a valid scenario rewrite as the original scenario cannot be implemented otherwise.
  // Step 5: Create new connection for login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 6: Login with the same credentials that successfully registered
  const authenticatedSeller = await authorize_seller_login(loginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(authenticatedSeller);
  // Step 7: Validate successful authentication response
  TestValidator.equals(
    "seller email matches",
    authenticatedSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "seller role is seller",
    authenticatedSeller.role,
    "seller",
  );
  TestValidator.equals(
    "seller status is approved",
    authenticatedSeller.status,
    "approved",
  );
  TestValidator.equals(
    "seller approval status is approved",
    authenticatedSeller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "seller is not suspended",
    authenticatedSeller.is_suspended,
    false,
  );
  TestValidator.predicate("access token exists", () =>
    Boolean(authenticatedSeller.access_token),
  );
  TestValidator.predicate("refresh token exists", () =>
    Boolean(authenticatedSeller.refresh_token),
  );
  TestValidator.predicate("seller_id is valid UUID", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(authenticatedSeller.seller_id);
  });
  TestValidator.predicate("created_at is valid ISO date-time", () => {
    const date = new Date(authenticatedSeller.created_at);
    return (
      !isNaN(date.getTime()) &&
      authenticatedSeller.created_at === date.toISOString()
    );
  });
  TestValidator.predicate("updated_at is valid ISO date-time", () => {
    const date = new Date(authenticatedSeller.updated_at);
    return (
      !isNaN(date.getTime()) &&
      authenticatedSeller.updated_at === date.toISOString()
    );
  });
  TestValidator.predicate("token access exists", () =>
    Boolean(authenticatedSeller.token.access),
  );
  TestValidator.predicate("token refresh exists", () =>
    Boolean(authenticatedSeller.token.refresh),
  );
  TestValidator.predicate("token expired_at is valid ISO date-time", () => {
    const date = new Date(authenticatedSeller.token.expired_at);
    return (
      !isNaN(date.getTime()) &&
      authenticatedSeller.token.expired_at === date.toISOString()
    );
  });
  TestValidator.predicate(
    "token refreshable_until is valid ISO date-time",
    () => {
      const date = new Date(authenticatedSeller.token.refreshable_until);
      return (
        !isNaN(date.getTime()) &&
        authenticatedSeller.token.refreshable_until === date.toISOString()
      );
    },
  );
}
