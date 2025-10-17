import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscriptionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionLog";

/**
 * Verify audit ability and access boundaries for subscription logs.
 *
 * 1. Register primary member.
 * 2. Create community as the member.
 * 3. Member subscribes to the created community.
 * 4. Retrieve and validate member's subscription logs include at least the
 *    'subscribe' event.
 * 5. Register a secondary member and attempt to retrieve the primary member's
 *    subscription logs, expecting access denial.
 */
export async function test_api_subscription_log_member_access_audit_trail(
  connection: api.IConnection,
) {
  // 1. Register primary member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a community
  const communitySlug = RandomGenerator.alphaNumeric(8);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          slug: communitySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Member subscribes to that community
  const subscription: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 4. Retrieve subscription logs for the member
  const logs: IPageICommunityPlatformSubscriptionLog.ISummary =
    await api.functional.communityPlatform.member.subscriptions.logs.index(
      connection,
      {
        subscriptionId: subscription.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformSubscriptionLog.IRequest,
      },
    );
  typia.assert(logs);
  TestValidator.predicate(
    "subscription logs must contain at least the subscribe event",
    logs.data.some(
      (log) =>
        log.event_type === "subscribe" &&
        log.member_id === member.id &&
        log.community_id === community.id,
    ),
  );

  // 5. Register a secondary/unauthorized member
  const badMemberEmail: string = typia.random<string & tags.Format<"email">>();
  const badMemberPassword = RandomGenerator.alphaNumeric(12);
  const badMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: badMemberEmail,
        password: badMemberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(badMember);

  // Switch to unauthorized/bad member (by setting token)
  await api.functional.auth.member.join(connection, {
    body: {
      email: badMemberEmail,
      password: badMemberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });

  // Try to access the original member's subscription logs; should fail authorization
  await TestValidator.error(
    "unauthorized member cannot access another member's subscription audit logs",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.logs.index(
        connection,
        {
          subscriptionId: subscription.id,
          body: {
            page: 1,
            limit: 20,
          } satisfies ICommunityPlatformSubscriptionLog.IRequest,
        },
      );
    },
  );
}
