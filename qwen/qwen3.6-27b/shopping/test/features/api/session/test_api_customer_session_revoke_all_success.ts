import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformActiveSessionRevocation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformActiveSessionRevocation";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer session revocation of all active sessions.
 *
 * Validates the complete session revocation workflow where an authenticated customer terminates all their active sessions across all devices. The test ensures that the system correctly tracks and revokes sessions with proper audit trail preservation.
 *
 * Upon successful customer registration, an active session is automatically established. When the revoke-all endpoint is called, the system soft-deletes customer sessions by setting a deleted_at timestamp rather than permanently deleting them, preserving the audit trail.
 *
 * 1. Register a new customer account, which creates initial identity and establishes an active session.
 * 2. Call the revoke-all endpoint to terminate all active sessions for the customer.
 * 3. Validate that the revoke-all response returns a revokedCount of 1.
 */
export async function test_api_customer_session_revoke_all_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer, which establishes an active session
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(customer);
  // 2. Revoke all active sessions for the authenticated customer
  const revocation =
    await api.functional.ecommercePlatform.customer.sessions.active.revoke_all.revokeAll(
      customerConnection,
    );
  typia.assert(revocation);
  // 3. Validate that exactly one session (from registration) was revoked
  TestValidator.equals("revokedCount equals 1", revocation.revokedCount, 1);
}
