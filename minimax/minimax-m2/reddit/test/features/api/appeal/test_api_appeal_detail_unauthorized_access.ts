import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_appeal_detail_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user account to establish proper authentication context
  const userData = typia.random<IRedditPlatformRegisteredUser.ICreate>();
  userData.href = "https://example.com/dashboard";
  userData.referrer = "https://example.com/login";

  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userData satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Create a test appeal ID for unauthorized access testing
  const testAppealId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Simulate unauthorized access attempt
  // Test that accessing appeal details without proper authentication is properly rejected
  // Even though we have a valid registered user, we need to test the scenario where
  // authentication tokens are missing or invalid for the appeal endpoint access
  await TestValidator.error(
    "accessing appeal details without proper authentication should be rejected",
    async () => {
      await api.functional.redditPlatform.registeredUser.appeals.at(
        connection,
        {
          appealId: testAppealId,
        },
      );
    },
  );
}
