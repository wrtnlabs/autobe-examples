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
 * Test seller registration with pending approval status business rule.
 *
 * Validates that upon successful seller registration, the account is created with correct initial status and profile values. Ensures new sellers cannot immediately perform seller-specific operations until administrator approval.
 *
 * 1. Creates a new seller account with random credentials via registration endpoint
 * 2. Verifies approval_status is 'pending' requiring administrator review
 * 3. Confirms suspended and banned flags are false for new accounts
 * 4. Validates that approval_reason and rejection_reason are null for pending status
 * 5. Checks that deleted_at is null for active accounts
 * 6. Verifies created_at and updated_at timestamps are set
 * 7. Validates JWT tokens (access, refresh) are included with expiration metadata
 * 8. Confirms shop profile has default values (shop_name, shop_description strings, logo_uri null)
 */
export async function test_api_seller_join_pending_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection for authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register new seller with random credentials
  const registered = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 3. Validate complete response structure using typia
  typia.assert(registered);
  // 4. Verify pending approval status business rule
  TestValidator.equals(
    "approval_status is pending",
    registered.approval_status,
    "pending",
  );
  // 5. Verify null reasons for pending status
  TestValidator.equals(
    "approval_reason is null for pending",
    registered.approval_reason,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null for pending",
    registered.rejection_reason,
    null,
  );
  // 6. Verify account is not suspended or banned
  TestValidator.equals(
    "suspended is false for new seller",
    registered.suspended,
    false,
  );
  TestValidator.equals(
    "banned is false for new seller",
    registered.banned,
    false,
  );
  // 7. Verify account is not deleted
  TestValidator.equals(
    "deleted_at is null for active account",
    registered.deleted_at,
    null,
  );
  // 8. Verify timestamps exist and are parseable
  TestValidator.predicate(
    "created_at is valid timestamp",
    () => !isNaN(new Date(registered.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    () => !isNaN(new Date(registered.updated_at).getTime()),
  );
  // 9. Verify JWT token fields exist
  TestValidator.predicate(
    "token.access exists",
    registered.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh exists",
    registered.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at exists",
    () => !isNaN(new Date(registered.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "token.refreshable_until exists",
    () => !isNaN(new Date(registered.token.refreshable_until).getTime()),
  );
  // 10. Verify shop profile has expected default values
  TestValidator.predicate(
    "shop_name is non-empty",
    registered.shop_name.length > 0,
  );
  TestValidator.equals(
    "logo_uri is null for new seller",
    registered.logo_uri,
    null,
  );
  // 11. Verify seller identity fields exist
  TestValidator.predicate("id exists", registered.id.length > 0);
  TestValidator.predicate("email exists", registered.email.length > 0);
}
