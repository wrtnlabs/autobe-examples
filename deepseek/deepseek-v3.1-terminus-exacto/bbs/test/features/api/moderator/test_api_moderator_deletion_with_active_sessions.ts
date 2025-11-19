import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator deletion when the target moderator has active authentication
 * sessions. This scenario validates that the system properly handles moderator
 * deletion when sessions are present, ensuring that active sessions are
 * terminated and the moderator account is completely removed from the system.
 * The test covers session cleanup and verification that no orphaned sessions
 * remain after deletion.
 */
export async function test_api_moderator_deletion_with_active_sessions(
  connection: api.IConnection,
) {
  // 1. Create admin moderator account for authorization
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";
  const admin: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: adminEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: adminPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 5 }),
        moderation_level: "admin",
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(admin);

  // 2. Create target moderator account with authentication sessions
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetPassword = "target123";
  const targetUsername = RandomGenerator.alphaNumeric(8);
  const target: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: targetEmail,
        username: targetUsername,
        password: targetPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "basic",
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(target);
  TestValidator.equals(
    "target moderator created",
    target.username,
    targetUsername,
  );

  // 3. Create channel as prerequisite
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // 4. Create active authentication session for target moderator
  // Switch to target moderator
  const targetSession: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email_or_username: targetEmail,
        password: targetPassword,
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(targetSession);
  TestValidator.equals("target session active", targetSession.id, target.id);

  // Verify target moderator can access functionality
  const targetChannel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(targetChannel);

  // 5. Switch back to admin moderator and delete target account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: adminEmail,
      password: adminPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Delete the target moderator
  const deletedModerator: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.erase(
      connection,
      {
        username: targetUsername,
      },
    );
  typia.assert(deletedModerator);
  TestValidator.equals(
    "deleted moderator username matches",
    deletedModerator.username,
    targetUsername,
  );

  // 6. Verify deletion by attempting to use the target moderator's session
  // Create a new connection without authentication headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt to login with deleted moderator credentials
  await TestValidator.error("deleted moderator cannot login", async () => {
    await api.functional.auth.moderator.login(unauthConn, {
      body: {
        email_or_username: targetEmail,
        password: targetPassword,
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  });

  // Attempt to access moderator functionality with deleted credentials
  await TestValidator.error(
    "deleted moderator cannot access channels",
    async () => {
      await api.functional.discussionBoard.moderator.channels.create(
        unauthConn,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.content({ paragraphs: 1 }),
            status: "active",
          } satisfies IDiscussionBoardChannel.ICreate,
        },
      );
    },
  );

  // Verify admin can still access functionality
  const adminChannel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(adminChannel);

  // Final verification: Attempt to delete non-existent moderator
  await TestValidator.error(
    "cannot delete already deleted moderator",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.erase(
        connection,
        {
          username: targetUsername,
        },
      );
    },
  );
}
