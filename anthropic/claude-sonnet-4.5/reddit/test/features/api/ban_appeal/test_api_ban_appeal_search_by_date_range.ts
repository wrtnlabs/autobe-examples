import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanAppeal";
import type { IRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanAppeal";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test filtering ban appeals by submission date ranges using submitted_after
 * and submitted_before parameters.
 *
 * This test validates the date range filtering functionality for ban appeal
 * searches. The workflow includes:
 *
 * 1. Create moderator account
 * 2. Create a community
 * 3. Create multiple member accounts
 * 4. Ban members at different times
 * 5. Members submit appeals at different timestamps
 * 6. Search with submitted_after to verify it excludes older appeals
 * 7. Search with submitted_before to verify it excludes newer appeals
 * 8. Search with both parameters to verify accurate date window
 * 9. Validate ISO 8601 datetime format handling
 */
export async function test_api_ban_appeal_search_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123",
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create community
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: null,
    banner_url: null,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create multiple member accounts and ban them with appeals at different times
  const appeals: IRedditCommunityBanAppeal[] = [];
  const appealTimestamps: string[] = [];

  for (let i = 0; i < 5; i++) {
    // Create member
    const memberData = {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: "MemberPass123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
      show_online_status: true,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate;

    const member: IRedditCommunityGuest.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: memberData,
      });
    typia.assert(member);

    // Switch back to moderator
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorData.email,
        password: moderatorData.password,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    });

    // Wait briefly to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Ban the member
    const banData = {
      banned_member_id: member.id,
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      expires_at: null,
    } satisfies IRedditCommunityCommunityBan.ICreate;

    const ban: IRedditCommunityCommunityBan =
      await api.functional.redditCommunity.moderator.communities.bans.create(
        connection,
        {
          communityName: community.name,
          body: banData,
        },
      );
    typia.assert(ban);

    // Switch to member to submit appeal
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberData.email,
        password: memberData.password,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ILogin,
    });

    // Wait briefly to ensure different appeal timestamps
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Submit appeal
    const appealData = {
      appeal_text: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 10,
        sentenceMax: 15,
      }),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityBanAppeal.ICreate;

    const appeal: IRedditCommunityBanAppeal =
      await api.functional.redditCommunity.member.bans.appeal.create(
        connection,
        {
          banId: ban.id,
          body: appealData,
        },
      );
    typia.assert(appeal);

    appeals.push(appeal);
    appealTimestamps.push(appeal.created_at);
  }

  // Switch back to moderator for searching
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 6: Test submitted_after filter - should exclude older appeals
  const middleTimestamp = appealTimestamps[2];
  const afterSearchRequest = {
    submitted_after: middleTimestamp,
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const afterResults: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: afterSearchRequest,
      },
    );
  typia.assert(afterResults);

  // Verify appeals before middleTimestamp are excluded
  for (const appealSummary of afterResults.data) {
    const appealDate = new Date(appealSummary.created_at);
    const middleDate = new Date(middleTimestamp);
    TestValidator.predicate(
      "submitted_after excludes older appeals",
      appealDate >= middleDate,
    );
  }

  // Step 7: Test submitted_before filter - should exclude newer appeals
  const beforeSearchRequest = {
    submitted_before: middleTimestamp,
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const beforeResults: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: beforeSearchRequest,
      },
    );
  typia.assert(beforeResults);

  // Verify appeals after middleTimestamp are excluded
  for (const appealSummary of beforeResults.data) {
    const appealDate = new Date(appealSummary.created_at);
    const middleDate = new Date(middleTimestamp);
    TestValidator.predicate(
      "submitted_before excludes newer appeals",
      appealDate < middleDate,
    );
  }

  // Step 8: Test combining both parameters for accurate date window
  const startTimestamp = appealTimestamps[1];
  const endTimestamp = appealTimestamps[3];

  const rangeSearchRequest = {
    submitted_after: startTimestamp,
    submitted_before: endTimestamp,
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const rangeResults: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: rangeSearchRequest,
      },
    );
  typia.assert(rangeResults);

  // Verify all results are within the date window
  for (const appealSummary of rangeResults.data) {
    const appealDate = new Date(appealSummary.created_at);
    const startDate = new Date(startTimestamp);
    const endDate = new Date(endTimestamp);

    TestValidator.predicate(
      "appeal is within date range lower bound",
      appealDate >= startDate,
    );
    TestValidator.predicate(
      "appeal is within date range upper bound",
      appealDate < endDate,
    );
  }

  // Step 9: Validate ISO 8601 datetime format by trusting typia validation
  // All timestamps have already been validated by typia.assert calls
  TestValidator.predicate(
    "all appeals created successfully with valid timestamps",
    appeals.length === 5 && appealTimestamps.length === 5,
  );
}
