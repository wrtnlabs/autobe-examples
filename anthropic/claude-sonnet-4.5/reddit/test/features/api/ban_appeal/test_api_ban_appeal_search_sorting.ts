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
 * Test sorting ban appeals by different fields (submitted_at, reviewed_at,
 * status, community) in ascending and descending order.
 *
 * This test validates the ban appeal search API's sorting functionality by:
 *
 * 1. Creating a moderator and community
 * 2. Creating multiple member accounts and banning them
 * 3. Having each member submit ban appeals at different times
 * 4. Testing sorting by submitted_at field in both asc and desc order
 * 5. Testing sorting by status field
 * 6. Verifying default sorting behavior when parameters are omitted
 *
 * Expected outcomes:
 *
 * - Ascending order returns oldest appeals first
 * - Descending order returns newest appeals first
 * - Status sorting groups appeals correctly
 * - Default sorting behavior is consistent
 */
export async function test_api_ban_appeal_search_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create multiple members, ban them, and have them submit appeals
  const appealCount = 5;
  const createdAppeals: IRedditCommunityBanAppeal[] = [];
  const memberCredentials: Array<{
    email: string;
    password: string;
    id: string;
  }> = [];

  for (let i = 0; i < appealCount; i++) {
    // Create member account
    const memberPassword = typia.random<string & tags.MinLength<8>>();
    const memberEmail = typia.random<string & tags.Format<"email">>();

    const member = await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: typia.random<boolean>(),
        show_subscribed_communities: typia.random<boolean>(),
        show_activity_feed: typia.random<boolean>(),
        ip: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
    typia.assert(member);
    memberCredentials.push({
      email: memberEmail,
      password: memberPassword,
      id: member.id,
    });

    // Switch back to moderator to ban the member
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    });

    const ban =
      await api.functional.redditCommunity.moderator.communities.bans.create(
        connection,
        {
          communityName: community.name,
          body: {
            banned_member_id: member.id,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
            expires_at: null,
          } satisfies IRedditCommunityCommunityBan.ICreate,
        },
      );
    typia.assert(ban);

    // Switch to member to submit appeal
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        ip: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ILogin,
    });

    const appeal =
      await api.functional.redditCommunity.member.bans.appeal.create(
        connection,
        {
          banId: ban.id,
          body: {
            appeal_text: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 10,
              sentenceMax: 15,
            }),
            ip: typia.random<string>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IRedditCommunityBanAppeal.ICreate,
        },
      );
    typia.assert(appeal);
    createdAppeals.push(appeal);
  }

  // Switch back to moderator for searching appeals
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 4: Test sorting by submitted_at ascending
  const ascResults =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: {
          sort_by: "submitted_at",
          sort_order: "asc",
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(ascResults);

  TestValidator.predicate(
    "ascending results should have appeals",
    ascResults.data.length === appealCount,
  );

  // Verify ascending order - each appeal should be older or equal to the next
  for (let i = 0; i < ascResults.data.length - 1; i++) {
    const current = new Date(ascResults.data[i].created_at).getTime();
    const next = new Date(ascResults.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `ascending order: appeal ${i} should be before or equal to appeal ${i + 1}`,
      current <= next,
    );
  }

  // Step 5: Test sorting by submitted_at descending
  const descResults =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: {
          sort_by: "submitted_at",
          sort_order: "desc",
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(descResults);

  TestValidator.predicate(
    "descending results should have appeals",
    descResults.data.length === appealCount,
  );

  // Verify descending order - each appeal should be newer or equal to the next
  for (let i = 0; i < descResults.data.length - 1; i++) {
    const current = new Date(descResults.data[i].created_at).getTime();
    const next = new Date(descResults.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `descending order: appeal ${i} should be after or equal to appeal ${i + 1}`,
      current >= next,
    );
  }

  // Step 6: Verify ascending and descending produce opposite orderings
  TestValidator.predicate(
    "first appeal in asc should be last in desc",
    ascResults.data[0].id === descResults.data[descResults.data.length - 1].id,
  );

  TestValidator.predicate(
    "last appeal in asc should be first in desc",
    ascResults.data[ascResults.data.length - 1].id === descResults.data[0].id,
  );

  // Step 7: Test sorting by status
  const statusResults =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: {
          sort_by: "status",
          sort_order: "asc",
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(statusResults);

  TestValidator.predicate(
    "status sorting should return all appeals",
    statusResults.data.length === appealCount,
  );

  // All appeals should have "pending" status since none have been reviewed
  for (const appeal of statusResults.data) {
    TestValidator.predicate(
      "all appeals should be pending",
      appeal.status === "pending",
    );
  }

  // Step 8: Test default sorting behavior (no sort parameters)
  const defaultResults =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: {} satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(defaultResults);

  TestValidator.predicate(
    "default sorting should return all appeals",
    defaultResults.data.length === appealCount,
  );
}
