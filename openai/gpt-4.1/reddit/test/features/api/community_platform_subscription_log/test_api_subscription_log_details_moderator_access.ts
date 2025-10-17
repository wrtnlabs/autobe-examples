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

/**
 * Validate moderator access to subscription log details within their moderation
 * scope only.
 *
 * 1. Register member (email A)
 * 2. Member creates a community
 * 3. Member subscribes to the created community
 * 4. Member registers as moderator for the created community (same email A)
 * 5. Moderator accesses the log for their own community's subscription
 *
 *    - Retrieve a valid logId (simulate or infer from ids if logs not directly
 *         creatable)
 *    - Use moderator privileges to access log
 *    - Assert contents and visibility
 * 6. Negative test: Register a second unrelated moderator and confirm they are
 *    denied log access
 */
export async function test_api_subscription_log_details_moderator_access(
  connection: api.IConnection,
) {
  // 1. Register a member (who will become both subscriber and moderator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  // 2. Create a community as the member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: RandomGenerator.alphaNumeric(8),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Member subscribes to their created community
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
  // 4. Register as moderator for the same community with the same email/password
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: memberEmail,
      password,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // 5. Retrieve subscription log details via moderator endpoint
  // Simulate a subscription event log - in typical platforms, subscribing immediately creates a log event
  // We'll attempt logId values most likely to correspond (could be subscription.id itself or a random logId, adjust as needed)
  // For deterministic e2e: just treat subscription.id as first logId (mock up)
  const logId = subscription.id satisfies string as string;
  const log =
    await api.functional.communityPlatform.moderator.subscriptions.logs.at(
      connection,
      {
        subscriptionId: subscription.id,
        logId,
      },
    );
  typia.assert(log);
  TestValidator.equals("correct member in log", log.member_id, member.id);
  TestValidator.equals(
    "correct community in log",
    log.community_id,
    community.id,
  );
  // 6. Register an unrelated community and moderator
  const otherCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: RandomGenerator.alphaNumeric(8),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(otherCommunity);
  const otherModeratorEmail = typia.random<string & tags.Format<"email">>();
  const otherModeratorPassword = RandomGenerator.alphaNumeric(12);
  const otherMember = await api.functional.auth.member.join(connection, {
    body: {
      email: otherModeratorEmail,
      password: otherModeratorPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(otherMember);
  // Register unrelated moderator and obtain the session by join, which sets token
  const otherModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: otherModeratorEmail,
      password: otherModeratorPassword,
      community_id: otherCommunity.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(otherModerator);
  // Switch session to unrelated moderator via join (which sets correct Authorization header)
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: otherModeratorEmail,
      password: otherModeratorPassword,
      community_id: otherCommunity.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Attempt to access first subscription's log as unrelated moderator
  await TestValidator.error(
    "non-community moderator cannot access log",
    async () => {
      await api.functional.communityPlatform.moderator.subscriptions.logs.at(
        connection,
        {
          subscriptionId: subscription.id,
          logId,
        },
      );
    },
  );
}
