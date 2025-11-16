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
 * Test retrieving ban appeals filtered by pending status.
 *
 * This test validates the complete ban appeal workflow and search
 * functionality:
 *
 * 1. Moderator creates account and community
 * 2. Member creates account
 * 3. Moderator bans the member
 * 4. Member submits ban appeal
 * 5. Moderator searches for pending appeals
 * 6. Verify appeal appears with correct status and complete data
 */
export async function test_api_ban_appeal_search_by_status_pending(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<(string & tags.Format<"uri">) | null | undefined>(),
    banner_url: typia.random<
      (string & tags.Format<"uri">) | null | undefined
    >(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberData = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<
      (string & tags.Format<"uri">) | null | undefined
    >(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Switch back to moderator and ban the member
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const banData = {
    banned_member_id: member.id,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    expires_at: null,
  } satisfies IRedditCommunityCommunityBan.ICreate;

  const ban =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: banData,
      },
    );
  typia.assert(ban);

  // Step 5: Switch to member and submit appeal
  await api.functional.auth.member.login(connection, {
    body: {
      username: memberData.username,
      password: memberData.password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const appealData = {
    appeal_text: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityBanAppeal.ICreate;

  const appeal = await api.functional.redditCommunity.member.bans.appeal.create(
    connection,
    {
      banId: ban.id,
      body: appealData,
    },
  );
  typia.assert(appeal);

  // Step 6: Switch back to moderator and search for pending appeals
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const searchRequest = {
    page: 1,
    limit: 10,
    status: "pending" as const,
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const searchResult =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  // Step 7: Verify the results
  TestValidator.predicate(
    "search result should contain at least one appeal",
    searchResult.data.length > 0,
  );

  const foundAppeal = searchResult.data.find((a) => a.id === appeal.id);
  if (!foundAppeal) {
    throw new Error("Appeal not found in search results");
  }
  typia.assertGuard(foundAppeal);

  TestValidator.equals(
    "found appeal status should be pending",
    foundAppeal.status,
    "pending",
  );

  TestValidator.equals(
    "found appeal member id should match",
    foundAppeal.member.id,
    member.id,
  );

  TestValidator.equals(
    "found appeal community id should match",
    foundAppeal.community.id,
    community.id,
  );

  TestValidator.equals(
    "found appeal ban id should match",
    foundAppeal.ban.id,
    ban.id,
  );

  TestValidator.predicate(
    "pagination current page should be valid",
    searchResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    searchResult.pagination.limit === searchRequest.limit,
  );

  TestValidator.predicate(
    "pagination records should be positive",
    searchResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be positive",
    searchResult.pagination.pages >= 0,
  );
}
