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
 * Verify not-found behavior when a community moderator fetches a moderation
 * action by an ID that does not exist or is out of their visible scope.
 *
 * Business context
 *
 * - Community moderators operate on moderation actions that are within their
 *   communities. When they request a moderation action by its UUID and that
 *   action cannot be resolved in their scope, the platform must respond with a
 *   not-found style error instead of leaking details or returning a generic
 *   server error.
 * - This test ensures that, under a valid authenticated moderator context, the
 *   moderationActions.at endpoint fails cleanly when given a random,
 *   non-existent moderationActionId.
 *
 * High-level flow
 *
 * 1. Register a community moderator via POST /auth/communityModerator/join.
 *
 *    - Provide a realistic ICommunityPlatformCommunityModerator.IJoin payload.
 *    - Rely on the SDK to configure Authorization headers based on the response
 *         token bundle.
 * 2. As this authenticated moderator, issue a GET request to
 *    /communityPlatform/communityModerator/moderationActions/{moderationActionId}
 *    using a freshly generated UUID.
 *
 *    - We do not create any moderation actions in this scenario, so this ID is
 *         effectively non-existent in a real environment.
 * 3. Assert that the GET call fails by throwing an error.
 *
 *    - Use TestValidator.error with an async closure to verify that an error is
 *         raised when attempting to fetch a non-existent moderation action.
 *    - Per global testing rules, we DO NOT inspect HTTP status codes or error body
 *         structure; we only validate that the call does not succeed.
 *
 * Validation goals
 *
 * - Moderator registration succeeds and returns a well-formed
 *   ICommunityPlatformCommunityModerator.IAuthorized object.
 * - Subsequent attempt to fetch a moderation action by a random UUID fails and is
 *   captured by TestValidator.error.
 */
export async function test_api_community_moderator_get_moderation_action_not_found(
  connection: api.IConnection,
) {
  // 1. Register a community moderator (join) to obtain an authenticated context.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "203.0.113.10",
    href: "https://moderation.example.com/register",
    referrer: "https://moderation.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const authorizedModerator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedModerator);

  // 2. Generate a random UUID that we will use as a non-existent moderationActionId.
  const nonexistentModerationActionId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to fetch the moderation action and assert that the call fails.
  await TestValidator.error(
    "community moderator fetching nonexistent moderation action should fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.moderationActions.at(
        connection,
        {
          moderationActionId: nonexistentModerationActionId,
        },
      );
    },
  );
}
