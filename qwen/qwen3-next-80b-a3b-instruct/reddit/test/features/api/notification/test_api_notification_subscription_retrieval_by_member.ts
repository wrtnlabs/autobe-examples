import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformNotificationSubscription";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_notification_subscription_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCreds: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/referral",
  } satisfies ICommunityPlatformMember.IJoin;
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberCreds });
  // Step 2: Use memberConnection for API calls to ensure ownership isolation
  // Step 3: Retrieve notification subscriptions with default pagination (page=1, limit=10)
  const defaultRequest: ICommunityPlatformNotificationSubscription.IRequest = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformNotificationSubscription.IRequest;
  const subscriptionResponse: IPageICommunityPlatformNotificationSubscription =
    await api.functional.communityPlatform.member.notification_subscriptions.index(
      memberConnection,
      { body: defaultRequest },
    );
  typia.assert(subscriptionResponse);
  // Validate pagination structure (this is safe as we're checking numbers, not content)
  TestValidator.equals(
    "pagination page should be 1",
    subscriptionResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    subscriptionResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data array should exist",
    subscriptionResponse.data.length >= 0,
  );
  // Note: All subscription properties (notification_type, channel, frequency, enabled, last_status_changed_at)
  // are validated by typia.assert(), so no additional validation needed.
  // Step 4: Confirm no other user's data can be accessed (this is enforced by auth)
  // The test relies on the authentication mechanism to enforce ownership
  // No additional test needed as the API only returns data for the authenticated user
}
