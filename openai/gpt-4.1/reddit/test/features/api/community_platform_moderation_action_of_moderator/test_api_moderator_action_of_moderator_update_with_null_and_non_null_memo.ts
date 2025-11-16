import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerationActionOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOfModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorSession";

/**
 * Test updating the memo field of a moderator-specific moderation action,
 * verifying both setting and clearing behavior as the same moderator.
 *
 * Scenario steps:
 *
 * 1. Register/join as a new platform moderator.
 * 2. Create a new moderator action for a random moderationActionId, starting with
 *    no memo.
 * 3. Update the memo to a non-null string, validate that it is correctly updated.
 * 4. Update the memo to null (clear it), validate that it is removed.
 * 5. At each state, validate the DTO structure according to the schema and ensure
 *    proper value propagation.
 */
export async function test_api_moderator_action_of_moderator_update_with_null_and_non_null_memo(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorHref =
    "https://moderator.example.com/" + RandomGenerator.alphaNumeric(8);
  const moderatorReferrer =
    "https://refer.example.com/" + RandomGenerator.alphaNumeric(8);
  const moderatorCreate = {
    email: moderatorEmail,
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
    href: moderatorHref satisfies string as string,
    referrer: moderatorReferrer satisfies string as string,
    ip: null,
  } satisfies ICommunityPlatformModerator.ICreate;
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreate,
  });
  typia.assert(moderatorAuth);

  // 2. Create a new moderator action linked to a random moderationActionId
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();
  const createModeratorActionBody =
    {} satisfies ICommunityPlatformModerationActionOfModerator.ICreate;
  const created =
    await api.functional.communityPlatform.moderator.moderationActions.moderatorAction.create(
      connection,
      {
        moderationActionId,
        body: createModeratorActionBody,
      },
    );
  typia.assert(created);
  // Ensure the memo is not set
  TestValidator.equals(
    "memo should initially be undefined or null",
    created.memo,
    undefined,
  );

  // 3. Update the memo to a non-null value
  const memoValue = RandomGenerator.paragraph({ sentences: 2 });
  const updatedWithMemo =
    await api.functional.communityPlatform.moderator.moderationActions.moderatorAction.update(
      connection,
      {
        moderationActionId,
        body: {
          memo: memoValue,
        } satisfies ICommunityPlatformModerationActionOfModerator.IUpdate,
      },
    );
  typia.assert(updatedWithMemo);
  TestValidator.equals(
    "memo should be updated to string",
    updatedWithMemo.memo,
    memoValue,
  );

  // 4. Update the memo to null
  const updatedWithNull =
    await api.functional.communityPlatform.moderator.moderationActions.moderatorAction.update(
      connection,
      {
        moderationActionId,
        body: {
          memo: null,
        } satisfies ICommunityPlatformModerationActionOfModerator.IUpdate,
      },
    );
  typia.assert(updatedWithNull);
  TestValidator.equals("memo should now be null", updatedWithNull.memo, null);

  // 5. Check base identity fields remain consistent
  TestValidator.equals(
    "moderation action id remains the same after updates",
    updatedWithNull.moderation_action_id,
    moderationActionId,
  );
  TestValidator.equals(
    "moderator id matches",
    updatedWithNull.moderator.id,
    moderatorAuth.id,
  );
}
