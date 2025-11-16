import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * E2E test for removing (soft-deleting) a moderator assignment from a community
 * by administrator.
 *
 * This test verifies a privileged workflow for moderator removal, ensuring
 * correct privilege handling, audit compliance, and error isolation. It
 * performs the following steps:
 *
 * 1. Registers (authenticates) as a new system administrator to gain privileged
 *    access.
 * 2. Creates a community moderator in a generated community (using a random
 *    community name).
 * 3. Removes (soft-deletes) the moderator assignment via the administrator
 *    endpoint, using the valid communityName and moderatorId.
 * 4. Asserts that the result reflects a successful soft-delete (deleted_at is set
 *
 *    - ISO 8601).
 * 5. Attempts a second deletion for the same moderator assignment and verifies the
 *    error is raised (soft-deleted moderator cannot be removed twice).
 * 6. Attempts deletion with random UUID and bogus community name to confirm not
 *    found/business errors are thrown without leaking sensitive data.
 *
 * Steps:
 *
 * - Register administrator: api.functional.auth.administrator.join
 * - Create moderator:
 *   api.functional.communityPlatform.administrator.communities.moderators.create
 * - Remove moderator:
 *   api.functional.communityPlatform.administrator.communities.moderators.erase
 * - Validate soft-delete (deleted_at set)
 * - Negative: Remove already deleted assignment
 * - Negative: Remove with invalid moderator ID/community
 */
export async function test_api_moderator_assignment_removal_by_administrator(
  connection: api.IConnection,
) {
  // Register (join) as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminJoinResult = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        business_status: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminJoinResult);
  TestValidator.equals(
    "administrator email matches input",
    adminJoinResult.email,
    adminEmail,
  );

  // Pick a random community name
  const communityName = RandomGenerator.alphaNumeric(12);

  // Create a moderator in the community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorInput = {
    email: moderatorEmail,
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
    business_status: RandomGenerator.paragraph({ sentences: 2 }),
    href: `https://community.example.com/${communityName}` as string &
      tags.Format<"uri">,
    referrer: `https://community.example.com/home` as string &
      tags.Format<"uri">,
    ip: null,
  } satisfies ICommunityPlatformModerator.ICreate;
  const moderator =
    await api.functional.communityPlatform.administrator.communities.moderators.create(
      connection,
      {
        communityName,
        body: moderatorInput,
      },
    );
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator is active before removal",
    moderator.status,
    "active",
  );
  TestValidator.equals(
    "deleted_at is null before removal",
    moderator.deleted_at,
    null,
  );

  // Soft-delete (erase) the moderator assignment
  const erased =
    await api.functional.communityPlatform.administrator.communities.moderators.erase(
      connection,
      {
        communityName,
        moderatorId: moderator.id,
      },
    );
  typia.assert(erased);
  TestValidator.equals(
    "soft-deleted moderator id matches original",
    erased.id,
    moderator.id,
  );
  TestValidator.predicate(
    "deleted_at is set after removal",
    typeof erased.deleted_at === "string" && erased.deleted_at.length > 0,
  );

  // Attempt to erase the same (already deleted) moderator assignment again
  await TestValidator.error(
    "cannot soft-delete an already-removed moderator",
    async () => {
      await api.functional.communityPlatform.administrator.communities.moderators.erase(
        connection,
        {
          communityName,
          moderatorId: moderator.id,
        },
      );
    },
  );

  // Attempt to erase a moderator from a non-existent community
  await TestValidator.error(
    "cannot soft-delete moderator in non-existent community",
    async () => {
      await api.functional.communityPlatform.administrator.communities.moderators.erase(
        connection,
        {
          communityName: "nonexistent-community-test",
          moderatorId: moderator.id,
        },
      );
    },
  );

  // Attempt to erase a non-existent moderator in the valid community
  await TestValidator.error(
    "cannot soft-delete a non-existent moderator",
    async () => {
      await api.functional.communityPlatform.administrator.communities.moderators.erase(
        connection,
        {
          communityName,
          moderatorId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
