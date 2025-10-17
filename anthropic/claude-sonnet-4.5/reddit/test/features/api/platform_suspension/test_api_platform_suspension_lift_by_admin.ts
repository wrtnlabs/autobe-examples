import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";

/**
 * Test platform suspension lift workflow by administrator.
 *
 * This test validates that an administrator can successfully lift an active
 * platform suspension. The test creates an admin account, creates a member
 * account, issues a platform suspension against the member, and then lifts the
 * suspension using the DELETE endpoint.
 *
 * The test focuses on the suspension management workflow from the
 * administrator's perspective, verifying that the suspension can be created and
 * subsequently removed through the erase operation.
 *
 * Test workflow:
 *
 * 1. Create administrator account with platform suspension management permissions
 * 2. Create member account (authentication switches to member)
 * 3. Create separate admin connection to maintain admin authentication
 * 4. Issue a temporary platform suspension against the member
 * 5. Verify the suspension is active with correct properties
 * 6. Lift the suspension using the DELETE endpoint
 *
 * Note: Due to available API limitations (no login endpoint), we cannot verify
 * member access restoration after suspension lift. The test focuses on the
 * administrative suspension management operations.
 */
export async function test_api_platform_suspension_lift_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Store admin token for later use
  const adminToken = admin.token.access;

  // Step 2: Create member account to be suspended
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Restore admin authentication context
  connection.headers = connection.headers || {};
  connection.headers.Authorization = adminToken;

  // Step 4: Issue platform suspension against the member
  const suspensionData = {
    suspended_member_id: member.id,
    suspension_reason_category: "harassment",
    suspension_reason_text:
      "Repeated violations of community harassment policy",
    is_permanent: false,
    expiration_date: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    internal_notes: "First offense - 7 day temporary suspension",
  } satisfies IRedditLikePlatformSuspension.ICreate;

  const suspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(suspension);

  // Step 5: Verify suspension is active with correct properties
  TestValidator.equals(
    "suspension targets correct member",
    suspension.suspended_member_id,
    member.id,
  );
  TestValidator.equals("suspension is active", suspension.is_active, true);
  TestValidator.equals(
    "suspension reason category",
    suspension.suspension_reason_category,
    "harassment",
  );
  TestValidator.equals(
    "suspension is temporary",
    suspension.is_permanent,
    false,
  );

  // Step 6: Lift the suspension
  await api.functional.redditLike.admin.platform.suspensions.erase(connection, {
    suspensionId: suspension.id,
  });
}
