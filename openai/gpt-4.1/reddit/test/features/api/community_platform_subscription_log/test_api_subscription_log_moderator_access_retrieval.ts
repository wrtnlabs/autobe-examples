import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscriptionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionLog";

/**
 * Test that a moderator can retrieve the paginated, searchable log of
 * subscription events for any valid community_platform_subscriptions record.
 *
 * Steps:
 *
 * 1. Register a new member (who will subscribe and also become moderator)
 * 2. Log in as that member (token context handled by SDK)
 * 3. Create a new community as that member (member is creator)
 * 4. Subscribe to the created community (obtain subscriptionId)
 * 5. Register the same member as a moderator for that community
 * 6. Logout, log in as moderator if switching is required (token handling via SDK)
 * 7. Query the log events for the subscription as a moderator
 * 8. Validate that returned logs contain relevant details (event_type, event_at,
 *    etc.)
 * 9. Try to access the logs as a regular member (should get forbidden)
 * 10. Try to access logs with invalid subscription ID (should get forbidden or
 *     empty)
 */
export async function test_api_subscription_log_moderator_access_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "P@ssw0rd123!";
  const memberJoinRes = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoinRes);
  // 2. Create a community as this member
  const communityName =
    RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4);
  const communitySlug =
    RandomGenerator.alphabets(4) + RandomGenerator.alphaNumeric(3);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: communitySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe as that member to the new community
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
  // 4. Register the same member as moderator for the community
  // Moderator registration requires the same email and community_id
  const moderatorJoinRes = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
        community_id: community.id,
      } satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  typia.assert(moderatorJoinRes);
  // 5. Query log as moderator for this subscription
  // SDK handles token context; we are now the moderator
  const logsPage =
    await api.functional.communityPlatform.moderator.subscriptions.logs.index(
      connection,
      {
        subscriptionId: subscription.id,
        body: {
          // Query for all, first page
        } satisfies ICommunityPlatformSubscriptionLog.IRequest,
      },
    );
  typia.assert(logsPage);
  // 6. Confirm structure: logs match expectations, fields present
  TestValidator.equals(
    "log pagination subscriptionId",
    logsPage.data[0]?.community_id,
    community.id,
  );
  if (logsPage.data.length > 0) {
    TestValidator.equals(
      "member_id in logs matches",
      logsPage.data[0].member_id,
      memberJoinRes.id,
    );
    TestValidator.equals(
      "event_type present in logs",
      typeof logsPage.data[0].event_type,
      "string",
    );
    TestValidator.predicate(
      "event_at is valid ISO-8601 date",
      typeof logsPage.data[0].event_at === "string" &&
        !!Date.parse(logsPage.data[0].event_at),
    );
  }
  // 7. As a regular member, try to access log (forbidden)
  // Logout/log back in as member (simulate by reissuing join)
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  // Trying as member: should be forbidden
  await TestValidator.error(
    "member cannot access moderator-only log endpoint",
    async () => {
      await api.functional.communityPlatform.moderator.subscriptions.logs.index(
        connection,
        {
          subscriptionId: subscription.id,
          body: {},
        },
      );
    },
  );
  // 8. Query as moderator with non-existent subscription ID
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  await TestValidator.error("access with invalid subscriptionId", async () => {
    await api.functional.communityPlatform.moderator.subscriptions.logs.index(
      connection,
      {
        subscriptionId: typia.random<string & tags.Format<"uuid">>(),
        body: {},
      },
    );
  });
}
