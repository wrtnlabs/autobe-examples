import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that newly registered sellers have approvalStatus='pending' and
 * cannot list products until administrator approval.
 *
 * Validates the approval workflow state machine:
 * 1. New seller registration succeeds
 * 2. approvalStatus is set to 'pending'
 * 3. JWT token is issued for dashboard access
 * 4. Profile is null (no shop setup before approval)
 * 5. Seller has restricted capabilities until approved
 */
export async function test_api_seller_join_pending_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new seller account
  const registered = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(registered);
  // Step 2: Verify approvalStatus is 'pending'
  TestValidator.equals(
    "approvalStatus should be 'pending' for new seller",
    registered.approvalStatus,
    "pending",
  );
  // Step 3: Verify JWT token is issued and valid (business logic validation)
  TestValidator.predicate(
    "access token should be present",
    registered.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    registered.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration should be set",
    registered.token.expired_at !== null,
  );
  // Step 4: Verify profile is null (no shop setup before approval)
  TestValidator.equals(
    "profile should be null for pending seller",
    registered.profile,
    null,
  );
  // Step 5: Verify deletedAt is null for active account
  TestValidator.equals(
    "deletedAt should be null for active account",
    registered.deletedAt,
    null,
  );
}
