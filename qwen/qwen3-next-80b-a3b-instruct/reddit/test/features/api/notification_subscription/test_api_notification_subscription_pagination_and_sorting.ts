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
export async function test_api_notification_subscription_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to access notification subscriptions
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Retrieve the current notification subscriptions (expect empty)
  const emptyResponse =
    await api.functional.communityPlatform.member.notification_subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformNotificationSubscription.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // Step 3: Test pagination on empty dataset
  TestValidator.equals(
    "pagination page should be 1 for first page",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 5",
    emptyResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "records should be 0 on empty set",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0 on empty set",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should be empty",
    emptyResponse.data.length,
    0,
  );
  // Step 4: Test pagination with page=2 on empty dataset — should still be valid, empty array
  const secondPageResponse =
    await api.functional.communityPlatform.member.notification_subscriptions.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformNotificationSubscription.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page response should have page 2",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page response should have limit 5",
    secondPageResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "second page data should be empty",
    secondPageResponse.data.length,
    0,
  );
  // Step 5: Test sorting by status ascending — still valid on empty set
  const statusAscResponse =
    await api.functional.communityPlatform.member.notification_subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort_by: "status",
          order: "asc",
        } satisfies ICommunityPlatformNotificationSubscription.IRequest,
      },
    );
  typia.assert(statusAscResponse);
  TestValidator.equals(
    "status ascending response data should be empty",
    statusAscResponse.data.length,
    0,
  );
  TestValidator.equals(
    "status ascending pagination page",
    statusAscResponse.pagination.current,
    1,
  );
  // Step 6: Test sorting by status descending — still valid on empty set
  const statusDescResponse =
    await api.functional.communityPlatform.member.notification_subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort_by: "status",
          order: "desc",
        } satisfies ICommunityPlatformNotificationSubscription.IRequest,
      },
    );
  typia.assert(statusDescResponse);
  TestValidator.equals(
    "status descending response data should be empty",
    statusDescResponse.data.length,
    0,
  );
  TestValidator.equals(
    "status descending pagination page",
    statusDescResponse.pagination.current,
    1,
  );
  // Step 7: Test sorting by channel ascending — still valid on empty set
  const channelAscResponse =
    await api.functional.communityPlatform.member.notification_subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort_by: "channel",
          order: "asc",
        } satisfies ICommunityPlatformNotificationSubscription.IRequest,
      },
    );
  typia.assert(channelAscResponse);
  TestValidator.equals(
    "channel ascending response data should be empty",
    channelAscResponse.data.length,
    0,
  );
  TestValidator.equals(
    "channel ascending pagination page",
    channelAscResponse.pagination.current,
    1,
  );
  // Step 8: Test sorting by channel descending — still valid on empty set
  const channelDescResponse =
    await api.functional.communityPlatform.member.notification_subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort_by: "channel",
          order: "desc",
        } satisfies ICommunityPlatformNotificationSubscription.IRequest,
      },
    );
  typia.assert(channelDescResponse);
  TestValidator.equals(
    "channel descending response data should be empty",
    channelDescResponse.data.length,
    0,
  );
  TestValidator.equals(
    "channel descending pagination page",
    channelDescResponse.pagination.current,
    1,
  );
}
