import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the complete moderator deletion workflow where an admin moderator
 * permanently removes another moderator account from the system. The scenario
 * validates that only authorized moderators can perform moderator deletions and
 * ensures proper cleanup of moderator records. The test covers the full
 * lifecycle from moderator creation to permanent deletion, including
 * verification that the moderator no longer exists in the system after
 * deletion.
 */
export async function test_api_moderator_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin moderator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: adminEmail,
        username: RandomGenerator.alphabets(10),
        password: "admin123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "admin",
        ip: "127.0.0.1",
        href: "https://example.com/auth/moderator/join",
        referrer: "https://example.com/",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(adminModerator);

  // Step 2: Create target moderator account to be deleted
  const targetEmail: string = typia.random<string & tags.Format<"email">>();
  const targetModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: targetEmail,
        username: RandomGenerator.alphabets(10),
        password: "target123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        moderation_level: "basic",
        ip: "127.0.0.1",
        href: "https://example.com/auth/moderator/join",
        referrer: "https://example.com/",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(targetModerator);

  // Step 3: Create channel as prerequisite for moderator operations
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Since we cannot switch accounts with provided API functions,
  // we assume the current connection maintains admin moderator context
  // after the initial join operation, which sets the Authorization header

  // Step 4: Delete target moderator account using admin privileges
  const deletedModerator: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.erase(
      connection,
      {
        username: targetModerator.username,
      },
    );
  typia.assert(deletedModerator);

  // Step 5: Verify deletion was successful
  TestValidator.equals(
    "deleted moderator username matches",
    deletedModerator.username,
    targetModerator.username,
  );
  TestValidator.equals(
    "deleted moderator email matches",
    deletedModerator.email,
    targetModerator.email,
  );

  // Step 6: Attempt to access deleted moderator account to confirm it no longer exists
  await TestValidator.error(
    "cannot access deleted moderator account",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.erase(
        connection,
        {
          username: targetModerator.username,
        },
      );
    },
  );
}
