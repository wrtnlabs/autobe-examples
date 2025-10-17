import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaPenalty";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Validates retrieval and filtering of a member's karma-affecting event history
 * (votes, penalties, rewards).
 *
 * Steps:
 *
 * 1. Register a member (simulate user account)
 * 2. Create a community as the member
 * 3. Subscribe the member to the community
 * 4. Register a moderator (with valid member and community context)
 * 5. Moderator assigns a karma penalty to the test member in that community
 * 6. Query the member's karma history as that user, filtering by event type,
 *    community, and date range
 * 7. Validate that the returned history contains at least the applied penalty
 *    event with expected type/data
 * 8. Validate pagination metadata format
 * 9. Attempt to retrieve another users' history (should fail with error)
 */
export async function test_api_karma_history_retrieval_by_member(
  connection: api.IConnection,
) {
  // 1. Register test member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);
  // 2. Create test community as member
  const communityName = RandomGenerator.alphaNumeric(10);
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          slug: communitySlug,
          description: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
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
  // 4. Register a moderator for the same community (must use unique email)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword satisfies string as string,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  // 5. Moderator assigns a karma penalty to the member
  // Switch to moderator token
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  const penaltyValue = -RandomGenerator.pick([5, 10, 15, 20]);
  const penaltyReason = RandomGenerator.paragraph({ sentences: 5 });
  const now = new Date();
  const penalty =
    await api.functional.communityPlatform.moderator.karmaPenalties.create(
      connection,
      {
        body: {
          community_platform_member_id: memberAuth.id,
          community_platform_community_id: community.id,
          penalty_type: "deduction",
          penalty_value: penaltyValue,
          penalty_reason: penaltyReason,
          penalty_status: "active",
          applied_at: now.toISOString(),
          expires_at: null,
        } satisfies ICommunityPlatformKarmaPenalty.ICreate,
      },
    );
  typia.assert(penalty);
  // 6. Query member's karma history using filters (as the member)
  // Switch back to member
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  const after = new Date(now.getTime() - 60 * 1000).toISOString(); // 1 min earlier
  const before = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour after
  const queryFilter = {
    member_id: memberAuth.id satisfies string as string,
    community_id: community.id,
    event_type: "moderation_penalty", // Should cover penalty event
    after: after,
    before: before,
    sort: "event_time-desc",
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformKarmaHistory.IRequest;
  const pageResult =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: queryFilter,
      },
    );
  typia.assert(pageResult);
  // 7. Confirm penalty event is present and matches expected filter
  TestValidator.predicate(
    "returned events include penalty with matching member, community, event_type",
    pageResult.data.some(
      (event) =>
        event.community_platform_member_id === memberAuth.id &&
        event.community_platform_community_id === community.id &&
        event.event_type === "moderation_penalty" &&
        event.change_amount === penaltyValue,
    ),
  );
  // 8. Confirm pagination keys are present
  TestValidator.predicate(
    "pagination contains keys: current, limit, records, pages",
    "current" in pageResult.pagination &&
      "limit" in pageResult.pagination &&
      "records" in pageResult.pagination &&
      "pages" in pageResult.pagination,
  );
  // 9. Attempt to retrieve another user's karmaHistory (should fail)
  const outsiderEmail = typia.random<string & tags.Format<"email">>();
  const outsiderPassword = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.member.join(connection, {
    body: {
      email: outsiderEmail,
      password: outsiderPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error(
    "outsider cannot access other member's karma history",
    async () => {
      await api.functional.communityPlatform.member.karmaHistory.index(
        connection,
        {
          body: {
            member_id: memberAuth.id,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    },
  );
}
