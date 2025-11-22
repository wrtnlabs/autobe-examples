import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_appeal_detail_invalid_appeal_id(
  connection: api.IConnection,
) {
  // Step 1: Establish authentication as registered user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: userEmail,
        password: "password123",
        href: "https://test.example.com/registration",
        referrer: "https://test.example.com/landing",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Generate invalid appeal ID (valid UUID format but non-existent)
  const invalidAppealId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Attempt to retrieve appeal details with invalid appeal ID
  await TestValidator.error(
    "should reject request with invalid appeal ID",
    async () => {
      await api.functional.redditPlatform.registeredUser.appeals.at(
        connection,
        {
          appealId: invalidAppealId,
        },
      );
    },
  );
}
