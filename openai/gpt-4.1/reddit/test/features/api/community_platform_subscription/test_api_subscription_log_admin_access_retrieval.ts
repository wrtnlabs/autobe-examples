import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscriptionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionLog";

/**
 * Validate admin access to subscription logs and pagination/search logic.
 *
 * 1. Register and login as admin (admin context for all subsequent admin actions)
 * 2. Register member
 * 3. Member creates a community
 * 4. Member subscribes to community
 * 5. As admin, retrieve subscription log list for that subscription id
 * 6. Validate logs include event type "subscribe" and member/community IDs
 * 7. Test pagination options (limit, page)
 * 8. Test search option by event_type (should return filtered log)
 * 9. Attempt log access as unauthenticated connection (should be forbidden)
 * 10. As admin, create a dummy subscription with no logs, validate result is empty
 */
export async function test_api_subscription_log_admin_access_retrieval(
  connection: api.IConnection,
) {
  // 1. Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "P@ssw0rd1!",
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPass123!",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Member creates a community (simulate as member -- use existing connection since new member login is not available; assume member token is required for this call)
  const commInput = {
    name: RandomGenerator.name(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: commInput,
      },
    );
  typia.assert(community);

  // 4. Member subscribes to that community
  const subscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 5. As admin, retrieve logs for the subscription (admin context is active on connection)
  const query: ICommunityPlatformSubscriptionLog.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };
  const logsPage =
    await api.functional.communityPlatform.admin.subscriptions.logs.index(
      connection,
      {
        subscriptionId: subscription.id,
        body: query,
      },
    );
  typia.assert(logsPage);
  TestValidator.predicate("log events returned", logsPage.data.length >= 1);
  TestValidator.equals(
    "subscription id in log member_id",
    logsPage.data[0].member_id,
    subscription.member_id,
  );
  TestValidator.equals(
    "community id in log community_id",
    logsPage.data[0].community_id,
    subscription.community_id,
  );

  // 6. Pagination: request a small page size
  const logsPage2 =
    await api.functional.communityPlatform.admin.subscriptions.logs.index(
      connection,
      {
        subscriptionId: subscription.id,
        body: {
          ...query,
          limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(logsPage2);
  TestValidator.equals("page size 1", logsPage2.pagination.limit, 1);

  // 7. Search by event_type (should match subscribe)
  const logsSearch =
    await api.functional.communityPlatform.admin.subscriptions.logs.index(
      connection,
      {
        subscriptionId: subscription.id,
        body: { ...query, event_type: "subscribe" },
      },
    );
  typia.assert(logsSearch);
  TestValidator.predicate(
    "at least one subscribe event",
    logsSearch.data.some((log) => log.event_type === "subscribe"),
  );

  // 8. Attempt forbidden log access as unauthenticated (simulate by empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "forbid unauthenticated from accessing admin log API",
    async () => {
      await api.functional.communityPlatform.admin.subscriptions.logs.index(
        unauthConn,
        {
          subscriptionId: subscription.id,
          body: query,
        },
      );
    },
  );

  // 9. As admin, create another subscription that should have no logs
  const dummyCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(dummyCommunity);
  const dummySubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: dummyCommunity.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(dummySubscription);
  const emptyLogsPage =
    await api.functional.communityPlatform.admin.subscriptions.logs.index(
      connection,
      {
        subscriptionId: dummySubscription.id,
        body: query,
      },
    );
  typia.assert(emptyLogsPage);
  TestValidator.equals(
    "no log events for fresh subscription",
    emptyLogsPage.data,
    [],
  );
}
