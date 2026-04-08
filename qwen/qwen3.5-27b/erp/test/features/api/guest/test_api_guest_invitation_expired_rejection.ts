import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackGuest";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest invitation acceptance endpoint with invalid/expired invitation scenario.
 *
 * This test validates that the guest invitation acceptance endpoint properly rejects requests when the invitation is invalid, expired, or does not exist. Since there is no API endpoint available to create guest invitations programmatically, this test uses test data that will not match any existing invitation in the system.
 *
 * The test verifies that:
 * - The endpoint throws an error when the invitation token does not match any pending invitation
 * - The error is properly caught and handled
 * - No unauthorized access occurs with invalid credentials
 *
 * Note: Testing specifically with an expired invitation (expires_at in the past) requires pre-configured test data in the backend database. This test focuses on validating error handling for invalid invitations.
 *
 * 1. Create a guest connection from the base connection
 * 2. Generate test data with random invitation token (will not match any existing invitation)
 * 3. Call the guest join endpoint and expect it to throw an error
 * 4. Validate that the error is properly thrown using TestValidator.error
 */
export async function test_api_guest_invitation_expired_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate test data with random invitation token
  // This token will not match any existing invitation in the system
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    invitationToken: RandomGenerator.alphaNumeric(32),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackGuest.IJoin;
  // Test that the endpoint throws an error when invitation is invalid/expired
  // The random email and token will not match any existing invitation
  await TestValidator.error(
    "should reject invalid/expired invitation",
    async () => {
      await authorize_guest_join(guestConnection, {
        body: joinBody,
      });
    },
  );
}
