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
 * Test seller registration success path with authentication token validation.
 *
 * Validates the complete seller registration flow including account creation with pending approval status, JWT token generation, and response structure verification. Ensures that newly registered sellers receive proper authentication credentials while being restricted from seller operations until admin approval.
 *
 * The test verifies that the seller account is created with approval_status 'pending', rejection_reason is null for new registrations, and all timestamp fields are properly populated. The authorization token object must contain valid access and refresh tokens with appropriate expiration metadata.
 *
 * 1. Creates seller connection and registers with randomized credentials using authorize_seller_join utility.
 * 2. Validates response structure including seller ID, email, approval_status, and timestamps.
 * 3. Verifies authorization token contains access, refresh, expired_at, and refreshable_until fields.
 * 4. Confirms business logic: approval_status is 'pending', rejection_reason is null, deleted_at is null.
 */
export async function test_api_seller_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and register
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Validate business logic - approval workflow state
  TestValidator.equals(
    "approval status is pending",
    seller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "rejection reason is null for new registration",
    seller.rejection_reason,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    seller.deleted_at,
    null,
  );
  // 3. Validate timestamp business rules
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    new Date(seller.created_at).getTime() <=
      new Date(seller.updated_at).getTime(),
  );
  // 4. Validate token expiration business logic
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(seller.token.refreshable_until).getTime() >
      new Date(seller.token.expired_at).getTime(),
  );
}
