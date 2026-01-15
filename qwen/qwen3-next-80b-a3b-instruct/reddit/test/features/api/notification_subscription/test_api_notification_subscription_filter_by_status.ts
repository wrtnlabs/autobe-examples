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
export async function test_api_notification_subscription_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Test filter by status='active'
  const activeFilter =
    await api.functional.communityPlatform.member.notification_subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "active",
        } satisfies ICommunityPlatformNotificationSubscription.IRequest,
      },
    );
  typia.assert(activeFilter);
  TestValidator.predicate("active filter result structure is valid", () =>
    activeFilter.data.every(
      (sub) =>
        sub.enabled === true &&
        typeof sub.id === "string" &&
        typeof sub.notification_type === "string" &&
        typeof sub.channel === "string" &&
        typeof sub.frequency === "string" &&
        typeof sub.last_status_changed_at === "string",
    ),
  );
  // Step 3: Test filter by status='inactive'
  const inactiveFilter =
    await api.functional.communityPlatform.member.notification_subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "inactive",
        } satisfies ICommunityPlatformNotificationSubscription.IRequest,
      },
    );
  typia.assert(inactiveFilter);
  TestValidator.predicate("inactive filter result structure is valid", () =>
    inactiveFilter.data.every(
      (sub) =>
        sub.enabled === false &&
        typeof sub.id === "string" &&
        typeof sub.notification_type === "string" &&
        typeof sub.channel === "string" &&
        typeof sub.frequency === "string" &&
        typeof sub.last_status_changed_at === "string",
    ),
  );
  // Step 4: Test pagination with active filter
  const activeFilterPaginated =
    await api.functional.communityPlatform.member.notification_subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 3,
          status: "active",
        } satisfies ICommunityPlatformNotificationSubscription.IRequest,
      },
    );
  typia.assert(activeFilterPaginated);
  TestValidator.equals(
    "active filter pagination limit",
    activeFilterPaginated.data.length,
    3,
  );
  TestValidator.predicate("all active paginated results are enabled", () =>
    activeFilterPaginated.data.every((sub) => sub.enabled === true),
  );
  // Step 5: Test sorting by status with active filter
  const activeFilterSorted =
    await api.functional.communityPlatform.member.notification_subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "status",
          order: "asc",
          status: "active",
        } satisfies ICommunityPlatformNotificationSubscription.IRequest,
      },
    );
  typia.assert(activeFilterSorted);
  TestValidator.predicate("all sorted active results are enabled", () =>
    activeFilterSorted.data.every((sub) => sub.enabled === true),
  );
  // Step 6: Test with no status filter - should return all subscriptions
  const allSubscriptions =
    await api.functional.communityPlatform.member.notification_subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformNotificationSubscription.IRequest,
      },
    );
  typia.assert(allSubscriptions);
  TestValidator.predicate(
    "unfiltered contains both active and inactive if they exist",
    () => {
      // If data exists, ensure it contains both types if both are present
      const hasActive = allSubscriptions.data.some(
        (sub) => sub.enabled === true,
      );
      const hasInactive = allSubscriptions.data.some(
        (sub) => sub.enabled === false,
      );
      return (
        allSubscriptions.data.length === 0 ||
        (hasActive && hasInactive) ||
        hasActive ||
        hasInactive
      );
    },
  );
}
