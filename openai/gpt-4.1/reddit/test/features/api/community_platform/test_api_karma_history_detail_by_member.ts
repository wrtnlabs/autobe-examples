import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaAward } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaAward";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate that a member can retrieve details of their own karma history event.
 * This includes:
 *
 * 1. Member registration (join) and authentication
 * 2. Creation of a community by this member
 * 3. Admin issues a karma award to the member (which generates a karma history
 *    record)
 * 4. Member fetches their own karma history detail, validates correctness of
 *    references and event info
 * 5. Negative case: Member tries to fetch a non-existent or another member's karma
 *    history and is denied
 */
export async function test_api_karma_history_detail_by_member(
  connection: api.IConnection,
) {
  // 1. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Member creates a community
  const communitySlug = RandomGenerator.alphaNumeric(10);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(1),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          slug: communitySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Admin awards karma to member
  const now = new Date();
  const awardType = RandomGenerator.pick([
    "gold",
    "founder",
    "legendary",
  ] as const);
  const karmaAward: ICommunityPlatformKarmaAward =
    await api.functional.communityPlatform.admin.karmaAwards.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_community_id: community.id,
          award_type: awardType,
          award_reason: "Outstanding community contribution",
          event_time: now.toISOString(),
        } satisfies ICommunityPlatformKarmaAward.ICreate,
      },
    );
  typia.assert(karmaAward);

  // 4. Member fetches their own karma history detail for the award event
  const karmaHistoryId = karmaAward.id;
  const karmaHistory: ICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.member.karmaHistory.at(connection, {
      karmaHistoryId,
    });
  typia.assert(karmaHistory);
  // Validate event details
  TestValidator.equals(
    "history member reference",
    karmaHistory.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "history community reference",
    karmaHistory.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "history event type is award",
    karmaHistory.event_type,
    "award",
  );
  TestValidator.equals(
    "history change amount non-zero",
    karmaHistory.change_amount !== 0,
    true,
  );
  TestValidator.predicate(
    "history event_time matches award",
    karmaHistory.event_time === karmaAward.event_time,
  );

  // 5. Negative case: Attempt fetching a non-existent karma history record
  await TestValidator.error(
    "member cannot fetch non-existent karma history",
    async () => {
      await api.functional.communityPlatform.member.karmaHistory.at(
        connection,
        {
          karmaHistoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 5b. Negative case: Register another member and ensure they cannot fetch this history
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherPassword = RandomGenerator.alphaNumeric(12);
  const otherMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: otherEmail,
        password: otherPassword,
      },
    });
  typia.assert(otherMember);
  // Switch to new member's session
  await api.functional.auth.member.join(connection, {
    body: {
      email: otherEmail,
      password: otherPassword,
    },
  });
  await TestValidator.error(
    "other member cannot fetch someone else's karma history",
    async () => {
      await api.functional.communityPlatform.member.karmaHistory.at(
        connection,
        {
          karmaHistoryId,
        },
      );
    },
  );
}
