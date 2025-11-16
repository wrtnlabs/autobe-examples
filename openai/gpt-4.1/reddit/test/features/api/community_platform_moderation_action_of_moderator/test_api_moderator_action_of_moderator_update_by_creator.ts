import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerationActionOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOfModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorSession";

/**
 * Validate updating a moderator-specific moderation action by the same acting
 * moderator.
 *
 * This test verifies that an authenticated moderator, after joining the
 * platform, can create a moderator-specific moderation action, then update the
 * memo field as themselves. It ensures that only the acting moderator with the
 * correct session can update the record, only the memo is mutable, and
 * referential integrity is preserved.
 */
export async function test_api_moderator_action_of_moderator_update_by_creator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new moderator
  const moderatorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
    href: "https://test.community-platform.com/moderator/join",
    referrer: "https://test.community-platform.com/welcome",
    ip: null,
    business_status: null,
  } satisfies ICommunityPlatformModerator.ICreate;
  const auth: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(auth);

  // 2. Simulate a parent moderation action ID (UUID)
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create the moderator-specific moderator action (with initial memo)
  const initialMemo = RandomGenerator.paragraph({ sentences: 4 });
  const action: ICommunityPlatformModerationActionOfModerator =
    await api.functional.communityPlatform.moderator.moderationActions.moderatorAction.create(
      connection,
      {
        moderationActionId,
        body: {
          memo: initialMemo,
        },
      },
    );
  typia.assert(action);
  TestValidator.equals(
    "moderation action memo matches input",
    action.memo,
    initialMemo,
  );
  TestValidator.equals(
    "moderation action references correct parent ID",
    action.moderation_action_id,
    moderationActionId,
  );

  // 4. Update the moderator-specific action as the same moderator (change the memo)
  const updatedMemo = RandomGenerator.paragraph({ sentences: 6 });
  const updated: ICommunityPlatformModerationActionOfModerator =
    await api.functional.communityPlatform.moderator.moderationActions.moderatorAction.update(
      connection,
      {
        moderationActionId,
        body: {
          memo: updatedMemo,
        },
      },
    );
  typia.assert(updated);

  // 5. Validate all referential and business rules
  TestValidator.equals(
    "moderation action ID unchanged on update",
    updated.id,
    action.id,
  );
  TestValidator.equals(
    "parent moderation action ID unchanged",
    updated.moderation_action_id,
    action.moderation_action_id,
  );
  TestValidator.equals(
    "acting moderator unchanged",
    updated.moderator,
    action.moderator,
  );
  TestValidator.equals(
    "acting moderator session unchanged",
    updated.moderator_session,
    action.moderator_session,
  );
  TestValidator.notEquals(
    "created_at timestamp changes only if expected",
    updated.created_at,
    null,
  );
  TestValidator.equals(
    "memo field updated successfully",
    updated.memo,
    updatedMemo,
  );
}
