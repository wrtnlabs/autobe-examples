import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAppeal";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorSession";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministratorSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";

export async function test_api_appeals_authorization_missed_session(
  connection: api.IConnection,
) {
  // Step 1: Register a user to establish valid session credentials
  const registeredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: "testuser_appeals_" + RandomGenerator.alphaNumeric(8),
        email:
          "test_appeals_" + RandomGenerator.alphaNumeric(6) + "@example.com",
        password: "TestPassword123!",
        href: "https://example.com/test/appeals",
        referrer: "https://example.com/referrer",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(registeredUser);

  // Step 2: Create connection with invalid/missing session token
  const invalidConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: "Bearer invalid_token_" + RandomGenerator.alphaNumeric(32),
    },
  };

  // Step 3: Test appeals search with invalid session token
  await TestValidator.error(
    "appeals search should reject invalid session token",
    async () => {
      await api.functional.redditPlatform.registeredUser.appeals.index(
        invalidConnection,
        {
          body: {
            page: 1,
            limit: 20,
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    },
  );

  // Step 4: Create connection with missing authorization header
  const noAuthConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: undefined as any,
    },
  };

  // Step 5: Test appeals search without authorization header
  await TestValidator.error(
    "appeals search should reject missing authorization",
    async () => {
      await api.functional.redditPlatform.registeredUser.appeals.index(
        noAuthConnection,
        {
          body: {
            page: 1,
            limit: 10,
            status: "pending",
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    },
  );

  // Step 6: Test appeals search with empty authorization header
  const emptyAuthConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: "",
    },
  };

  // Step 7: Test appeals search with empty authorization header
  await TestValidator.error(
    "appeals search should reject empty authorization header",
    async () => {
      await api.functional.redditPlatform.registeredUser.appeals.index(
        emptyAuthConnection,
        {
          body: {
            page: 2,
            limit: 25,
            order_by: "created_at" as const,
            order_direction: "desc" as const,
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    },
  );
}
