import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";

/**
 * Ensure a community moderator can create a moderation action with valid
 * payload using the dedicated moderationActions endpoint.
 *
 * Business-focused reinterpretation of the original intent:
 *
 * - Although the high-level requirement mentioned rejecting moderation actions
 *   for non-existent reports, the concrete endpoint provided here does not
 *   accept any report identifier (binding is handled internally or via other
 *   endpoints that are not part of this test surface).
 * - There is also no listing or lookup API for moderation actions exposed in the
 *   available SDK, so we cannot verify absence/presence by querying.
 *
 * Within these constraints, this test validates the positive path:
 *
 * 1. Register (join) a community moderator; verify we receive an authorized
 *    moderator context and that the SDK attaches the access token to the shared
 *    connection.
 * 2. Using the authenticated moderator connection, create a moderation action with
 *    a realistic ICommunityPlatformModerationAction.ICreate payload:
 *
 *    - Community_id: random UUID to represent a community-scoped action.
 *    - Action_type: a concrete value like "remove_content".
 *    - Target_scope: a concrete value like "post".
 *    - Reason_summary: short human-readable explanation.
 *    - Notes_internal: longer internal-only notes.
 * 3. Assert that the create() call succeeds, returns a value matching
 *    ICommunityPlatformModerationAction, and that key business fields such as
 *    action_type and target_scope roundtrip correctly.
 *
 * This test focuses on authentication integration and the basic correctness of
 * the moderation action creation workflow exposed via this endpoint.
 */
export async function test_api_moderation_action_creation_requires_valid_report_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register (join) a new community moderator and obtain authorized context.
  const joinBody = typia.random<ICommunityPlatformCommunityModerator.IJoin>();

  const authorizedModerator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    authorizedModerator,
  );

  // Sanity check: the moderator id is a UUID and token structure exists.
  TestValidator.predicate(
    "moderator id should be a non-empty string",
    authorizedModerator.id.length > 0,
  );

  // 2. Create a moderation action as this authenticated moderator.
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const actionType = "remove_content";
  const targetScope = "post";

  const createBody = {
    community_id: communityId,
    action_type: actionType,
    target_scope: targetScope,
    reason_summary: RandomGenerator.paragraph({ sentences: 4 }),
    notes_internal: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(createdAction);

  // 3. Business-level validations on the response.
  TestValidator.predicate(
    "created moderation action should have a UUID id",
    createdAction.id.length > 0,
  );

  TestValidator.equals(
    "action_type should roundtrip from request to response",
    createdAction.action_type,
    actionType,
  );
  TestValidator.equals(
    "target_scope should roundtrip from request to response",
    createdAction.target_scope,
    targetScope,
  );

  // community_id is optional and may be normalized by the backend, so we only
  // assert that when it is present it is non-empty.
  if (
    createdAction.community_id !== null &&
    createdAction.community_id !== undefined
  ) {
    TestValidator.predicate(
      "when present, community_id should be a non-empty string",
      createdAction.community_id.length > 0,
    );
  }
}
