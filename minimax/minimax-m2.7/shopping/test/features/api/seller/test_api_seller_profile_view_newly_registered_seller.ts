import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
 * Test retrieving a newly registered seller's profile with default values.
 *
 * Validates that:
 * 1. Register a new seller account which creates an initial profile
 * 2. After successful registration, call the profile endpoint
 * 3. Verify the profile exists and contains valid default values
 * 4. The profile should be accessible with proper timestamps
 * 5. This validates that new sellers have an auto-created profile they can immediately view
 */
export async function test_api_seller_profile_view_newly_registered_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  // Validate authorization response
  typia.assert(authorized);
  TestValidator.equals(
    "approval status is pending",
    authorized.approval_status,
    "pending",
  );
  TestValidator.predicate(
    "seller has valid uuid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // Step 2: Call the profile endpoint with authenticated connection
  const profile =
    await api.functional.ecommerceMall.seller.profile.at(sellerConnection);
  // Step 3: Validate profile response
  typia.assert(profile);
  // Verify profile has required structure
  TestValidator.predicate(
    "profile has valid uuid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      profile.id,
    ),
  );
  TestValidator.predicate(
    "display_name is non-empty string",
    typeof profile.display_name === "string" && profile.display_name.length > 0,
  );
  TestValidator.predicate(
    "phone is non-empty string",
    typeof profile.phone === "string" && profile.phone.length >= 10,
  );
  // Verify customer summary structure matches seller account
  TestValidator.equals(
    "customer id matches seller id",
    profile.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer email matches seller email",
    profile.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "customer status is active",
    profile.customer.status,
    "active",
  );
  // Verify timestamps are reasonable (created_at should be before or equal to updated_at)
  const createdAt = new Date(profile.created_at);
  const updatedAt = new Date(profile.updated_at);
  TestValidator.predicate(
    "timestamps are in valid order",
    updatedAt.getTime() >= createdAt.getTime(),
  );
  // Verify timestamps are recent (within the last minute to ensure new seller)
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  TestValidator.predicate(
    "created_at is recent",
    createdAt.getTime() >= oneMinuteAgo,
  );
  TestValidator.predicate(
    "updated_at is recent",
    updatedAt.getTime() >= oneMinuteAgo,
  );
}
