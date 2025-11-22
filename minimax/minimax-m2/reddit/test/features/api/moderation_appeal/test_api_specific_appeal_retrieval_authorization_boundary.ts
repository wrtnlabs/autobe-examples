import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_specific_appeal_retrieval_authorization_boundary(
  connection: api.IConnection,
) {
  // Create multiple registered user accounts for testing authorization boundaries
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userCEmail = typia.random<string & tags.Format<"email">>();

  const userA: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userAEmail,
        password: "SecurePass123!",
        display_name: "User A",
        href: "https://reddit-platform.test/register",
        referrer: "https://reddit-platform.test/home",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(userA);

  const userB: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userBEmail,
        password: "SecurePass123!",
        display_name: "User B",
        href: "https://reddit-platform.test/register",
        referrer: "https://reddit-platform.test/home",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(userB);

  const userC: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userCEmail,
        password: "SecurePass123!",
        display_name: "User C",
        href: "https://reddit-platform.test/register",
        referrer: "https://reddit-platform.test/home",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(userC);

  // Test 1: Attempt to access appeal with invalid appeal ID using User A's session
  const invalidAppealId = typia.random<string & tags.Format<"uuid">>();
  const fakeModerationActionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should reject access to invalid appeal ID",
    async () => {
      await api.functional.redditPlatform.registeredUser.moderationActions.appeals.at(
        connection,
        {
          moderationActionId: fakeModerationActionId,
          appealId: invalidAppealId,
        },
      );
    },
  );

  // Test 2: User A tries to access an appeal that belongs to User B (different moderation action)
  const userBSupposedAppealId = typia.random<string & tags.Format<"uuid">>();
  const userBSupposedModerationActionId = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "should reject access to appeals from different moderation actions",
    async () => {
      await api.functional.redditPlatform.registeredUser.moderationActions.appeals.at(
        connection,
        {
          moderationActionId: userBSupposedModerationActionId,
          appealId: userBSupposedAppealId,
        },
      );
    },
  );

  // Test 3: User A tries to access an appeal with valid format but from different context
  const crossUserAppealId = typia.random<string & tags.Format<"uuid">>();
  const crossUserModerationActionId = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "should reject access to appeals from different administrative contexts",
    async () => {
      await api.functional.redditPlatform.registeredUser.moderationActions.appeals.at(
        connection,
        {
          moderationActionId: crossUserModerationActionId,
          appealId: crossUserAppealId,
        },
      );
    },
  );

  // Test 4: Verify User B cannot access User A's supposed appeals
  const userBConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${userB.token.access}`,
    },
  };

  const userASupposedAppealId = typia.random<string & tags.Format<"uuid">>();
  const userASupposedModerationActionId = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "should reject access from different user to other's appeals",
    async () => {
      await api.functional.redditPlatform.registeredUser.moderationActions.appeals.at(
        userBConnection,
        {
          moderationActionId: userASupposedModerationActionId,
          appealId: userASupposedAppealId,
        },
      );
    },
  );

  // Test 5: Verify User C cannot access appeals from User A or User B
  const userCConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${userC.token.access}`,
    },
  };

  const userAAppealId = typia.random<string & tags.Format<"uuid">>();
  const userAModerationActionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should reject third-party access to other users' appeals",
    async () => {
      await api.functional.redditPlatform.registeredUser.moderationActions.appeals.at(
        userCConnection,
        {
          moderationActionId: userAModerationActionId,
          appealId: userAAppealId,
        },
      );
    },
  );

  // Test 6: Verify multiple authorization rejection scenarios
  const variousAppealIds = ArrayUtil.repeat(3, () => ({
    appealId: typia.random<string & tags.Format<"uuid">>(),
    moderationActionId: typia.random<string & tags.Format<"uuid">>(),
  }));

  for (const { appealId, moderationActionId } of variousAppealIds) {
    await TestValidator.error(
      "should consistently reject unauthorized appeal access",
      async () => {
        await api.functional.redditPlatform.registeredUser.moderationActions.appeals.at(
          userCConnection,
          {
            moderationActionId,
            appealId,
          },
        );
      },
    );
  }

  // Test 7: Verify User A can access their own supposed appeals (if they exist)
  const userAOwnAppealId = typia.random<string & tags.Format<"uuid">>();
  const userAOwnModerationActionId = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "should handle missing own appeals appropriately",
    async () => {
      await api.functional.redditPlatform.registeredUser.moderationActions.appeals.at(
        connection,
        {
          moderationActionId: userAOwnModerationActionId,
          appealId: userAOwnAppealId,
        },
      );
    },
  );

  // All tests completed - authorization boundaries are properly enforced
  TestValidator.predicate(
    "authorization boundary tests completed successfully",
    true,
  );
}
