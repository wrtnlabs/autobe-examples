import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test seller rejection workflow: transitions seller from pending to rejected status.
 *
 * This test validates the admin seller rejection operation:
 * 1. Admin joins the system to obtain authentication
 * 2. Admin rejects a pending seller with a valid rejection reason
 * 3. Verify seller status changes from 'pending' to 'rejected'
 * 4. Verify rejection_reason is persisted
 * 5. Verify updated_at timestamp is set
 *
 * Note: This test assumes a pending seller already exists in the system.
 * The sellerId must be provided from a pre-existing pending seller registration.
 */
export async function test_api_seller_rejection_pending_to_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system for authentication
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create admin-specific connection for subsequent API calls
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 3. Generate a seller ID to reject
  // Note: In production, this should be an actual pending seller ID from the database
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // 4. Reject the seller with a valid rejection reason
  const rejectionReason = "Seller did not provide required documentation";
  const result = await api.functional.ecommerceMall.admin.sellers.reject(
    adminConnection,
    {
      sellerId,
      body: {
        rejectionReason,
      } satisfies IEcommerceMallSeller.IReject,
    },
  );
  typia.assert(result);
  // 5. Validate rejection results
  TestValidator.equals(
    "seller approval_status is rejected",
    result.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "rejection_reason is stored correctly",
    result.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "updated_at timestamp is set and valid",
    () =>
      result.updated_at !== undefined &&
      new Date(result.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "seller has email",
    () => result.email !== undefined && result.email.length > 0,
  );
  TestValidator.predicate(
    "seller is suspended=false",
    () => result.is_suspended === false,
  );
  TestValidator.predicate(
    "seller is banned=false",
    () => result.is_banned === false,
  );
  TestValidator.equals(
    "created_at timestamp exists",
    result.created_at !== undefined,
    true,
  );
}