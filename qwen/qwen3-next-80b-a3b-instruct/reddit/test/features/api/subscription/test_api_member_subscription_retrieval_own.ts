import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_subscription_retrieval_own(
  connection: api.IConnection,
) {
  // 1. Authenticate member user by joining with credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123!";
  const href = "https://community-platform.com/join";
  const referrer = "https://community-platform.com";
  const ip = "192.168.1.100";

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

  // 2. Test that attempting to retrieve a non-existent subscription (even with correct auth) returns error
  // Per API design, this endpoint enforces that the authenticated member must own the subscription
  // We use a random subscriptionId that does not exist in the system
  const nonExistentSubscriptionId = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "member cannot retrieve non-existent subscription",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.at(
        connection,
        {
          subscriptionId: nonExistentSubscriptionId,
        },
      );
    },
  );
}
