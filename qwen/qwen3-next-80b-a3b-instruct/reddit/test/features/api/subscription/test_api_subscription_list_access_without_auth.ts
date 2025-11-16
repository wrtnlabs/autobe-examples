import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { IPageICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscription";

export async function test_api_subscription_list_access_without_auth(
  connection: api.IConnection,
) {
  // Generate test data for member registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = "StrongPassword123!";
  const href = "https://community-platform.com/join";
  const referrer = "https://community-platform.com";
  const ip = "192.168.1.100";

  // Step 1: Register a new member (create authentication context as required)
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
        ip,
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Attempt to access subscription list without auth - create new connection without headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 3: Verify that unauthenticated access to subscription list returns 401 Unauthorized error
  await TestValidator.error(
    "Guest user should receive 401 Unauthorized for subscription list access",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.index(
        unauthConnection,
        {
          body: "" satisfies ICommunityPlatformSubscription.IRequest,
        },
      );
    },
  );
}
