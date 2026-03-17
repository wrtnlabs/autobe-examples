import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscriptionActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_subscription_activities_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Note: The scenario requires creating subscription activities, but we don't have
  // SDK functions for member creation, community creation, or subscription endpoints.
  // Based on the available DTOs and SDK functions, we can only test the admin
  // subscription activities endpoint with random request data.
  // This tests that the endpoint is accessible and returns valid paginated data.
  // Test 1: Fetch subscription activities with default pagination
  const page1 =
    await api.functional.communityPlatform.admin.subscription_activities.index(
      adminConnection,
      {
        body: {} satisfies ICommunityPlatformSubscriptionActivity.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "page1 has pagination data",
    page1.pagination.current >= 0 &&
      page1.pagination.limit >= 0 &&
      page1.pagination.records >= 0 &&
      page1.pagination.pages >= 0,
  );
  // Test 2: Fetch with specific pagination
  const page2 =
    await api.functional.communityPlatform.admin.subscription_activities.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 10 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformSubscriptionActivity.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "page2 pagination matches request",
    page2.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page2 current page is valid",
    page2.pagination.current >= 1,
  );
  // Test 3: Test filtering by event_type (possible values unknown from DTOs)
  // Since event_type is just string in DTO, we can test with random string
  // to see if filtering works (though it might return empty results)
  const page3 =
    await api.functional.communityPlatform.admin.subscription_activities.index(
      adminConnection,
      {
        body: {
          event_type: "subscribed",
        } satisfies ICommunityPlatformSubscriptionActivity.IRequest,
      },
    );
  typia.assert(page3);
  // Test 4: Test date range filtering with random dates
  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const page4 =
    await api.functional.communityPlatform.admin.subscription_activities.index(
      adminConnection,
      {
        body: {
          from_event_time: past.toISOString(),
          to_event_time: now.toISOString(),
        } satisfies ICommunityPlatformSubscriptionActivity.IRequest,
      },
    );
  typia.assert(page4);
  // Test 5: Test combined filtering with posting_permission_changed
  const page5 =
    await api.functional.communityPlatform.admin.subscription_activities.index(
      adminConnection,
      {
        body: {
          posting_permission_changed: true,
          limit: 5 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformSubscriptionActivity.IRequest,
      },
    );
  typia.assert(page5);
  TestValidator.equals("page5 limit matches", page5.pagination.limit, 5);
  // Validate structure of returned activities
  if (page1.data.length > 0) {
    const activity = page1.data[0];
    TestValidator.predicate(
      "activity has required fields",
      activity.id !== undefined &&
        activity.event_type !== undefined &&
        activity.event_time !== undefined &&
        activity.posting_permission_changed !== undefined &&
        activity.feed_inclusion_changed !== undefined &&
        activity.created_at !== undefined &&
        activity.member !== undefined &&
        activity.community !== undefined,
    );
    TestValidator.predicate(
      "member summary has required fields",
      activity.member.id !== undefined &&
        activity.member.email !== undefined &&
        activity.member.username !== undefined &&
        activity.member.email_verified !== undefined &&
        activity.member.registered_at !== undefined,
    );
    TestValidator.predicate(
      "community summary has required fields",
      activity.community.id !== undefined &&
        activity.community.name !== undefined &&
        activity.community.created_at !== undefined &&
        activity.community.owner !== undefined &&
        activity.community.subscriber_count !== undefined,
    );
  }
}
