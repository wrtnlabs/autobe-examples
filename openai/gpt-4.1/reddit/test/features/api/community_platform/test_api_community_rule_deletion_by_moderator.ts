import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that a moderator can delete a community rule, that deletion is
 * successful, and errors are correct for repeated/non-existent/unauth access.
 *
 * Steps:
 *
 * 1. Register a new moderator (random email, password, status, auditing context
 *    fields).
 * 2. Define communityName/ruleCode (simulate existing entities).
 * 3. Authenticate as moderator (join yields JWT session).
 * 4. Delete the rule with
 *    api.functional.communityPlatform.moderator.communities.rules.erase as
 *    moderator.
 *
 *    - Validate (implicit) success (no error).
 * 5. Attempt to delete the same rule again, expect error (already deleted or not
 *    found).
 * 6. Attempt to delete a clearly non-existent rule, expect error.
 * 7. Attempt deletion as unauthenticated user, expect error (lack of auth).
 */
export async function test_api_community_rule_deletion_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator registration with random values
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorBody = {
    email: moderatorEmail,
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
    href: "https://test.community/join",
    referrer: "https://test.community/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformModerator.ICreate;
  const authorized: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(authorized);

  // 2. Prepare synthetic community and rule identifiers
  const communityName = `comm-${RandomGenerator.alphaNumeric(8)}`;
  const ruleCode = `rule-${RandomGenerator.alphaNumeric(6)}`;
  const nonExistentRule = `notfound-${RandomGenerator.alphaNumeric(6)}`;

  // 3. Auth: token from join already set in connection

  // 4. Delete the rule as the moderator (should succeed)
  await api.functional.communityPlatform.moderator.communities.rules.erase(
    connection,
    { communityName, ruleCode },
  );
  // No error: deletion succeeded

  // 5. Try to delete same rule again; expect error
  await TestValidator.error(
    "deleting already-deleted rule returns error",
    async () => {
      await api.functional.communityPlatform.moderator.communities.rules.erase(
        connection,
        { communityName, ruleCode },
      );
    },
  );
  // 6. Delete a completely non-existent rule
  await TestValidator.error(
    "deleting non-existent rule returns error",
    async () => {
      await api.functional.communityPlatform.moderator.communities.rules.erase(
        connection,
        { communityName, ruleCode: nonExistentRule },
      );
    },
  );
  // 7. Attempt deletion with an unauthenticated connection (should error)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated moderator rule delete returns error",
    async () => {
      await api.functional.communityPlatform.moderator.communities.rules.erase(
        unauthConnection,
        { communityName, ruleCode },
      );
    },
  );
}
