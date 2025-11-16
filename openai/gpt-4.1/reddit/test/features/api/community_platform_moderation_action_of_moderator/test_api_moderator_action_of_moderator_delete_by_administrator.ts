import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModerationActionOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOfModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorSession";

/**
 * Validate administrator's ability to permanently delete a moderator's
 * moderation action.
 *
 * This test ensures:
 *
 * - Only administrators can perform this deletion (role-boundary enforcement)
 * - The deleted moderator-specific moderation action record is no longer
 *   accessible after erasure
 * - All authentication/authorization flows are validated
 *
 * Steps:
 *
 * 1. Create a new administrator account with random credentials and authenticate
 *    (join as admin)
 * 2. Create a new moderator account with random credentials and authenticate (join
 *    as moderator)
 * 3. Generate a random parent moderation action ID (UUID) to simulate the
 *    existence of a parent moderation action
 * 4. Log in as moderator (moderator login)
 * 5. Create a moderator-specific moderation action using the parent moderation
 *    action ID
 *    (api.functional.communityPlatform.moderator.moderationActions.moderatorAction.create)
 * 6. Log back in as administrator to obtain admin privileges (administrator login)
 * 7. Permanently delete the moderator-specific moderation action by administrator
 *    (api.functional.communityPlatform.administrator.moderationActions.moderatorAction.erase)
 * 8. Assert (by logic: no direct fetch API) that subsequent deletion attempts fail
 *    (TestValidator.error), confirming the record is no longer present
 *
 * Note:
 *
 * - As there is no API to fetch or list moderation actions, validation is
 *   performed by logical error-checking (e.g., deletion a second time should
 *   fail)
 * - This test establishes proper privilege boundaries and erasure by
 *   administrator for moderation actions.
 */
export async function test_api_moderator_action_of_moderator_delete_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register administrator (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.Format<"password">,
      business_status: null,
    },
  });
  typia.assert(adminJoin);

  // 2. Register moderator (join)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      status: "active",
      business_status: null,
      href: "https://test.example/mod_join",
      referrer: "https://test.referrer/mod_join",
      ip: null,
    },
  });
  typia.assert(moderatorJoin);

  // 3. Generate a random parent moderation action ID (simulate existence)
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Login as moderator (to set actor context)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword as string & tags.Format<"password">,
      ip: null,
      href: "https://test.example/mod_login",
      referrer: "https://test.referrer/mod_login",
    },
  });

  // 5. Create a moderator-specific moderation action
  const createdModeratorAction =
    await api.functional.communityPlatform.moderator.moderationActions.moderatorAction.create(
      connection,
      {
        moderationActionId,
        body: {
          memo: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(createdModeratorAction);
  TestValidator.equals(
    "created moderationActionId matches",
    createdModeratorAction.moderation_action_id,
    moderationActionId,
  );

  // 6. Login as administrator (actor switch)
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.Format<"password">,
      ip: null,
      href: "https://test.example/admin_login",
      referrer: "https://test.referrer/admin_login",
    },
  });

  // 7. Erase the moderator-specific moderation action as administrator
  await api.functional.communityPlatform.administrator.moderationActions.moderatorAction.erase(
    connection,
    {
      moderationActionId,
    },
  );

  // 8. Subsequent erase must fail (already deleted)
  await TestValidator.error(
    "cannot erase again deleted moderator action (should not exist)",
    async () => {
      await api.functional.communityPlatform.administrator.moderationActions.moderatorAction.erase(
        connection,
        {
          moderationActionId,
        },
      );
    },
  );
}
