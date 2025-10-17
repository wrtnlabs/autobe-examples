import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";

/**
 * Test early termination of a temporary suspension before its natural
 * expiration date.
 *
 * This test validates that administrators can manually lift temporary
 * suspensions that were set to expire in the future, providing early
 * restoration of access for members who demonstrate good behavior or when
 * suspensions were issued too harshly.
 *
 * Workflow:
 *
 * 1. Create an administrator account for managing suspension lifecycle
 * 2. Preserve admin authentication token for later use
 * 3. Create a member account to receive a temporary suspension
 * 4. Restore admin authentication for suspension management
 * 5. Issue a temporary suspension with future expiration date (7 days from now)
 * 6. Verify the suspension is active with the correct expiration date
 * 7. Lift the suspension early using the delete endpoint
 */
export async function test_api_platform_suspension_early_termination(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for managing suspensions
  const adminData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Preserve admin token before creating member
  const adminToken = admin.token.access;

  // Step 3: Create member account to receive temporary suspension
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Restore admin authentication by setting the preserved token
  connection.headers = connection.headers || {};
  connection.headers.Authorization = adminToken;

  // Step 5: Issue a temporary suspension with future expiration (7 days from now)
  const futureExpirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const suspensionData = {
    suspended_member_id: member.id,
    suspension_reason_category: "Harassment",
    suspension_reason_text:
      "Temporary suspension for violation of community guidelines",
    internal_notes: "First offense - temporary suspension issued",
    is_permanent: false,
    expiration_date: futureExpirationDate.toISOString(),
  } satisfies IRedditLikePlatformSuspension.ICreate;

  const suspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(suspension);

  // Step 6: Verify the suspension is active with correct expiration date
  TestValidator.equals("suspension is active", suspension.is_active, true);
  TestValidator.equals(
    "suspension is not permanent",
    suspension.is_permanent,
    false,
  );
  TestValidator.equals(
    "suspended member ID matches",
    suspension.suspended_member_id,
    member.id,
  );
  TestValidator.equals(
    "suspension reason category matches",
    suspension.suspension_reason_category,
    "Harassment",
  );
  TestValidator.equals(
    "suspension reason text matches",
    suspension.suspension_reason_text,
    "Temporary suspension for violation of community guidelines",
  );

  // Step 7: Lift the suspension early using the delete endpoint
  await api.functional.redditLike.admin.platform.suspensions.erase(connection, {
    suspensionId: suspension.id,
  });

  // The suspension has been successfully lifted before its expiration date
  // The member's access should now be restored despite the suspension not reaching its expiration
}
