import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_moderation_appeal_non_existent_action(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a registered user
  const userData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  };

  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userData satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Attempt to create an appeal with a non-existent moderation action ID
  const nonExistentActionId = typia.random<string & tags.Format<"uuid">>();

  const appealData = {
    appeal_reason:
      "I believe this moderation action was taken in error and should be reviewed.",
    additional_evidence:
      "I have screenshots showing the content was within community guidelines.",
    appeal_level: "community" as const,
  };

  // Step 3: Verify that the API properly handles the non-existent action
  await TestValidator.error(
    "should fail when attempting to appeal non-existent moderation action",
    async () => {
      await api.functional.redditPlatform.registeredUser.moderationActions.appeals.create(
        connection,
        {
          moderationActionId: nonExistentActionId,
          body: appealData satisfies IRedditPlatformModerationAppeal.ICreate,
        },
      );
    },
  );
}
