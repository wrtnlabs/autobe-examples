import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that platform admin cannot assign a community moderator for a
 * non-existent community.
 *
 * Business purpose:
 *
 * - Ensure that moderator assignments are always scoped to a real community row
 *   and that the system rejects attempts to bind moderators to missing or
 *   unknown communities, even when the caller is a fully privileged
 *   platformAdmin and core master data is configured.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate a platform administrator using the join endpoint.
 * 2. As this platform admin, create one account status master record to ensure
 *    account status master data exists.
 * 3. Create one community visibility level master record to ensure visibility
 *    level master data exists.
 * 4. Without creating any community for a deliberately bogus identifier, attempt
 *    to create a community moderator assignment under that identifier using a
 *    syntactically valid ICommunityPlatformCommunityModeratorAssignment.ICreate
 *    body.
 * 5. Assert that the moderator assignment creation fails due to the missing
 *    community context (any error is sufficient; the exact HTTP status code is
 *    not validated).
 */
export async function test_api_platform_admin_moderator_assignment_requires_existing_community(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an account status master record.
  const accountStatusBody = {
    key: "ACTIVE",
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusBody },
    );
  typia.assert(accountStatus);

  // 3. Create a community visibility level master record.
  const visibilityBody = {
    code: "public",
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibility);

  // 4. Prepare a bogus community identifier that is guaranteed not to exist.
  // We use a random UUID-like string that is never used to create a community in this test.
  const bogusCommunityIdentifier: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 5. Prepare a syntactically valid moderator assignment create body.
  const moderatorAssignmentBody = {
    communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
    assignedAt: new Date().toISOString(),
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  // 6. Attempt to create a moderator assignment for the non-existent community
  //    and assert that an error is thrown. We intentionally do not check the
  //    exact HTTP status code, only that the operation fails.
  await TestValidator.error(
    "creating moderator assignment for non-existent community must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
        connection,
        {
          communityIdentifier: bogusCommunityIdentifier,
          body: moderatorAssignmentBody,
        },
      );
    },
  );
}
