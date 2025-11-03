import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

/**
 * This test validates that a moderator can create a new moderation action after
 * successfully joining (registering) as a moderator user.
 *
 * Steps:
 *
 * 1. Register a new moderator using the /auth/moderator/join endpoint.
 * 2. Using the returned moderator ID and authorization, create a moderation action
 *    record with valid details including action_type.
 * 3. Validate that the created moderation action matches the requested data and
 *    has valid UUIDs and timestamps.
 *
 * This test ensures the entire flow of moderator authentication and subsequent
 * moderation action creation works correctly.
 */
export async function test_api_moderator_create_moderation_action(
  connection: api.IConnection,
) {
  // 1. Moderator registration and authentication
  const moderatorJoinBody = {
    email: `mod_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: `Pwd!${RandomGenerator.alphaNumeric(8)}`,
    ip: null,
    href: `https://reddit.example.com/login`,
    referrer: `https://reddit.example.com/`,
  } satisfies IRedditCommunityModerator.IJoin;

  const authorizedModerator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(authorizedModerator);

  // 2. Prepare create moderation action body
  // Use exact moderator id from authorized moderator
  const createActionBody = {
    moderator_id: authorizedModerator.id,
    content_report_id: typia.random<string & tags.Format<"uuid">>(),
    action_type: RandomGenerator.pick([
      "deleted",
      "dismissed",
      "escalated",
    ] as const),
    action_notes: null,
  } satisfies IRedditCommunityModerationAction.ICreate;

  // 3. Create moderation action
  const moderationAction: IRedditCommunityModerationAction =
    await api.functional.redditCommunity.moderator.moderators.actions.create(
      connection,
      {
        moderatorId: authorizedModerator.id,
        body: createActionBody,
      },
    );
  typia.assert(moderationAction);

  // 4. Validate that response fields match the request data
  TestValidator.equals(
    "moderator id matches",
    moderationAction.moderator_id,
    createActionBody.moderator_id,
  );

  TestValidator.equals(
    "content report id matches",
    moderationAction.content_report_id,
    createActionBody.content_report_id,
  );

  TestValidator.equals(
    "action type matches",
    moderationAction.action_type,
    createActionBody.action_type,
  );

  TestValidator.equals(
    "action notes are null",
    moderationAction.action_notes,
    null,
  );

  // 5. Validate UUID format of moderation action id
  TestValidator.predicate(
    "moderation action id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      moderationAction.id,
    ),
  );

  // 6. Validate ISO 8601 date-time format for created_at and updated_at
  TestValidator.predicate(
    "created_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      moderationAction.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      moderationAction.updated_at,
    ),
  );
}
