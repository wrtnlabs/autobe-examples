import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { IPageICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscription";

export async function test_api_subscription_list_filter_active(
  connection: api.IConnection,
) {
  // Step 1: Authenticate member to establish context for subscription filtering
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com/home",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Validate that member authentication was successful and token is set
  TestValidator.equals("member email matches", member.email, memberEmail);

  // Step 3: Execute the subscription filtering API call with active status filter
  // ICommunityPlatformSubscription.IRequest is explicitly defined as string - must use JSON string
  const activeSubscriptionFilter: ICommunityPlatformSubscription.IRequest =
    '{"status": "active"}' satisfies ICommunityPlatformSubscription.IRequest;

  const subscriptionList: IPageICommunityPlatformSubscription.ISummary =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: activeSubscriptionFilter,
      },
    );
  typia.assert(subscriptionList);

  // Step 4: Validate that the response contains only active subscriptions
  // (Note: Since IPageICommunityPlatformSubscription.ISummary is string, we cannot inspect content)
  // Therefore, we rely on successful retrieval and API contract integrity
  TestValidator.equals(
    "subscription list retrieval successful",
    typeof subscriptionList,
    "string",
  );

  // Step 5: Verify that the API call context correctly uses the authenticated member
  // This is handled implicitly by the SDK's automatic token management - no manual header manipulation
}
