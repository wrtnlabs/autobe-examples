import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that a moderator can retrieve detailed profile information for another
 * moderator in the system.
 *
 * This test validates the complete flow of moderator-to-moderator profile
 * access with proper authentication, authorization checks, and data validation.
 * The scenario establishes authentication context, creates prerequisite channel
 * data, and verifies that moderator profile information is returned with all
 * expected fields including username, display name, moderation level, and
 * timestamps.
 */
export async function test_api_moderator_profile_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create retriever moderator account (the one who will perform the lookup)
  const retrieverEmail = typia.random<string & tags.Format<"email">>();
  const retriever = await api.functional.auth.moderator.join(connection, {
    body: {
      email: retrieverEmail,
      username: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 10,
      }),
      password: "testPassword123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      moderation_level: "senior",
      ip: "192.168.1.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(retriever);

  // 2. Create prerequisite channel data required for moderator operations
  const channel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 5,
        }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create target moderator account (the one whose profile will be retrieved)
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetUsername = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 10,
  });
  const target = await api.functional.auth.moderator.join(connection, {
    body: {
      email: targetEmail,
      username: targetUsername,
      password: "targetPassword123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      moderation_level: "basic",
      ip: "192.168.1.2",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(target);

  // 4. Retrieve the target moderator's profile using the retriever moderator's authentication
  const profile = await api.functional.discussionBoard.moderator.moderators.at(
    connection,
    {
      username: targetUsername,
    },
  );
  typia.assert(profile);

  // 5. Validate that the retrieved profile matches the expected data (business logic validation only)
  TestValidator.equals(
    "retrieved profile ID matches target moderator ID",
    profile.id,
    target.id,
  );
  TestValidator.equals(
    "retrieved username matches target username",
    profile.username,
    target.username,
  );
  TestValidator.equals(
    "retrieved display name matches target display name",
    profile.display_name,
    target.display_name,
  );
  TestValidator.equals(
    "retrieved moderation level matches target",
    profile.moderation_level,
    target.moderation_level,
  );
  TestValidator.equals(
    "created_at timestamp is present",
    profile.created_at,
    target.created_at,
  );
}
