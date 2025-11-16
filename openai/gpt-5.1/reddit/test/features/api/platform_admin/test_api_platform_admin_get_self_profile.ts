import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can retrieve their own detailed
 * profile.
 *
 * Business flow:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join, which also
 *    authenticates and issues JWT tokens, returning
 *    ICommunityPlatformPlatformadmin.IAuthorized.
 * 2. Optionally create an account status via POST
 *    /communityPlatform/platformAdmin/accountStatuses to exercise the
 *    dependency, even though join already assigns a valid status.
 * 3. Call GET /communityPlatform/platformAdmin/platformAdmins/{platformAdminId}
 *    using the id from the join response. The SDK has already set Authorization
 *    header on the connection.
 * 4. Assert that the response conforms to ICommunityPlatformPlatformadmin.
 * 5. Assert that id, username, email, displayName, accountStatus, and lifecycle
 *    timestamps are consistent with the join response, in particular that
 *    deletedAt is null/undefined for a fresh admin.
 */
export async function test_api_platform_admin_get_self_profile(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform administrator
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.local/register",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const authorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Basic sanity checks on authorized payload (business-level, not type-level)
  TestValidator.equals(
    "authorized id should be a stable UUID string",
    authorized.id,
    authorized.id,
  );
  TestValidator.equals(
    "authorized username should echo join payload",
    authorized.username,
    joinBody.username,
  );
  TestValidator.equals(
    "authorized email should echo join payload",
    authorized.email,
    joinBody.email,
  );
  TestValidator.predicate(
    "deletedAt should be null or undefined for fresh admin in authorized payload",
    authorized.deletedAt === null || authorized.deletedAt === undefined,
  );

  // 2. Optionally create an additional account status to exercise dependency
  const statusBody = {
    key: `TEST_STATUS_${RandomGenerator.alphabets(8)}`,
    label: "Test Status",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusBody,
      },
    );
  typia.assert(createdStatus);

  TestValidator.equals(
    "created account status key should echo request body",
    createdStatus.key,
    statusBody.key,
  );

  // 3. Retrieve self profile using the platform admin id from the join response
  const profile: ICommunityPlatformPlatformadmin =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.at(
      connection,
      {
        platformAdminId: authorized.id,
      },
    );
  typia.assert(profile);

  // 4. Validate that profile information matches authorized payload
  TestValidator.equals(
    "profile id must match authorized id",
    profile.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile username must match authorized username",
    profile.username,
    authorized.username,
  );
  TestValidator.equals(
    "profile email must match authorized email",
    profile.email,
    authorized.email,
  );
  TestValidator.equals(
    "profile displayName must match authorized displayName",
    profile.displayName,
    authorized.displayName,
  );

  // Compare accountStatus summary objects structurally via key fields
  TestValidator.equals(
    "profile accountStatus.id should match authorized accountStatus.id",
    profile.accountStatus.id,
    authorized.accountStatus.id,
  );
  TestValidator.equals(
    "profile accountStatus.code should match authorized accountStatus.code",
    profile.accountStatus.code,
    authorized.accountStatus.code,
  );

  // 5. Lifecycle and deletion semantics
  TestValidator.predicate(
    "profile createdAt should be same as or before updatedAt",
    profile.createdAt <= profile.updatedAt,
  );
  TestValidator.predicate(
    "profile deletedAt should be null or undefined for fresh admin",
    profile.deletedAt === null || profile.deletedAt === undefined,
  );
}
