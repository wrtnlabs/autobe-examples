import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that deleting a moderation action with a nonexistent id fails for a
 * properly authenticated platform administrator.
 *
 * Business intent:
 *
 * - The moderation actions table is part of the audit trail and should not
 *   silently accept deletion requests for records that do not exist.
 * - Even when a caller has platformAdmin privileges, attempting to delete a
 *   non-existent moderation action id must result in an error rather than a
 *   successful no-op.
 *
 * Scenario steps:
 *
 * 1. Register a new platformAdmin via POST /auth/platformAdmin/join to obtain an
 *    authenticated admin context. The SDK will manage the Authorization header
 *    automatically.
 * 2. Optionally create a real moderation action via POST
 *    /communityPlatform/platformAdmin/moderationActions to prove that the
 *    creation pipeline works and to have at least one real row in the system.
 *    This created action is not deleted in this test.
 * 3. Generate a fresh random UUID that is not used as any moderation action id in
 *    this test flow.
 * 4. Call DELETE
 *    /communityPlatform/platformAdmin/moderationActions/{moderationActionId}
 *    with the random UUID while authenticated as the platform admin.
 * 5. Assert that the call fails with an error using TestValidator.error,
 *    confirming that the platform does not silently succeed on deletion of a
 *    non-existent moderation action.
 */
export async function test_api_moderation_action_deletion_disallowed_for_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and establish authenticated context.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Optionally create a real moderation action to confirm pipeline works.
  const createBody = {
    community_id: null,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdAction);

  // Simple sanity check that created action has a non-empty id string.
  TestValidator.predicate(
    "created moderation action should have a non-empty id",
    () => typeof createdAction.id === "string" && createdAction.id.length > 0,
  );

  // 3. Generate a fresh random UUID that is very unlikely to match any existing
  // moderation action id in this test flow.
  let nonexistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonexistentId === createdAction.id) {
    nonexistentId = typia.random<string & tags.Format<"uuid">>();
  }

  // 4 & 5. Attempt to delete the non-existent moderation action id and
  // assert that an error occurs (without validating specific HTTP status).
  await TestValidator.error(
    "deleting a nonexistent moderation action id must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.moderationActions.erase(
        connection,
        {
          moderationActionId: nonexistentId,
        },
      );
    },
  );
}
