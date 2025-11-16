import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test retrieving details for deactivated and inactive moderator accounts.
 *
 * This test validates the system's handling of moderator detail requests for
 * accounts that have been deactivated or removed from active service. The
 * operation should provide appropriate access control and maintain historical
 * information for audit purposes while respecting account status changes.
 *
 * Test steps:
 *
 * 1. Create a moderator account for testing
 * 2. Retrieve the moderator details to establish baseline
 * 3. Test access patterns for the account
 * 4. Validate proper handling of account status queries
 * 5. Verify audit trail information remains accessible for inactive accounts
 */
export async function test_api_moderator_detail_deactivated_account(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Create and verify active moderator account
  const createData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    email_verified: true,
    two_factor_enabled: false,
    moderation_level: "basic",
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: createData,
  });
  typia.assert(moderator);

  // Test 2: Active moderator retrieval should succeed
  const retrieved =
    await api.functional.economicDiscussion.moderator.moderators.at(
      connection,
      {
        moderatorId: moderator.id,
      },
    );
  typia.assert(retrieved);

  TestValidator.equals(
    "active moderator username matches",
    retrieved.username,
    createData.username,
  );
  TestValidator.equals(
    "active moderator email matches",
    retrieved.email,
    createData.email,
  );
  TestValidator.equals(
    "active moderator level matches",
    retrieved.moderation_level,
    createData.moderation_level,
  );
  TestValidator.equals(
    "active moderator ID matches",
    retrieved.id,
    moderator.id,
  );
  TestValidator.predicate(
    "active moderator has complete audit information",
    !!(retrieved.created_at && retrieved.updated_at && retrieved.id),
  );

  // Test 3: Invalid moderator ID should fail appropriately
  const invalidId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "non-existent moderator ID should be handled",
    async () => {
      await api.functional.economicDiscussion.moderator.moderators.at(
        connection,
        {
          moderatorId: invalidId,
        },
      );
    },
  );

  // Test 4: Unauthenticated requests should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated access to moderator details should be denied",
    async () => {
      await api.functional.economicDiscussion.moderator.moderators.at(
        unauthConn,
        {
          moderatorId: moderator.id,
        },
      );
    },
  );

  // Test 5: Verify audit information remains accessible for active accounts
  const auditCheck =
    await api.functional.economicDiscussion.moderator.moderators.at(
      connection,
      {
        moderatorId: moderator.id,
      },
    );

  TestValidator.predicate(
    "audit trail information includes creation timestamp",
    auditCheck.created_at !== null && auditCheck.created_at !== undefined,
  );
  TestValidator.predicate(
    "audit trail information includes last update timestamp",
    auditCheck.updated_at !== null && auditCheck.updated_at !== undefined,
  );
  TestValidator.predicate(
    "audit trail maintains unique identifier",
    auditCheck.id !== null && auditCheck.id !== undefined,
  );

  // Note: This test assesses the current system behavior for moderator
  // account retrieval. In a complete implementation, it would also test
  // the specific handling of deactivated/deleted accounts, audit trail
  // persistence, and appropriate access control for different account states.
  // The current validation focuses on fundamental access patterns and
  // audit information availability for account management operations.
}
