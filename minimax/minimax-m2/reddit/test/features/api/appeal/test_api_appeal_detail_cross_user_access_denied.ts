import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_appeal_detail_cross_user_access_denied(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as first user (User A)
  const userAEmail: string = typia.random<string & tags.Format<"email">>();
  const userA: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: userAEmail,
        password: "password123",
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(userA);

  // Step 2: Generate a random appeal ID that would represent an appeal filed by User A
  // In a real scenario, this would be obtained from creating an actual appeal
  const appealIdA: string = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Logout/login as second user (User B) to establish different authentication context
  const userBEmail: string = typia.random<string & tags.Format<"email">>();
  const userB: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: userBEmail,
        password: "password123",
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(userB);

  // Step 4: Attempt to retrieve User A's appeal details using User B's credentials
  // This should be rejected due to cross-user access restrictions
  await TestValidator.error(
    "cross-user appeal access should be denied",
    async () => {
      await api.functional.redditPlatform.registeredUser.appeals.at(
        connection,
        {
          appealId: appealIdA,
        },
      );
    },
  );
}
