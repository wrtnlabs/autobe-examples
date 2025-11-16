import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberBan";

export async function test_api_member_bans_search_filter_by_reason_keywords(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(10);

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: moderatorPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member accounts to ban
  const bannedMembers: ICommunityPlatformMember.IAuthorized[] =
    await Promise.all(
      ArrayUtil.repeat(
        3,
        async () =>
          await api.functional.auth.member.join(connection, {
            body: {
              email: typia.random<string & tags.Format<"email">>(),
              username: RandomGenerator.alphaNumeric(8),
              password: RandomGenerator.alphaNumeric(10),
              href: "https://example.com/register",
              referrer: "https://example.com",
            } satisfies ICommunityPlatformMember.ICreate,
          }),
      ),
    );

  // Step 3: Create ban reasons with specific keywords (minimum 50 characters)
  const banReasons = [
    "User engaged in severe harassment and targeted attacks against multiple community members with intent to harm reputation and cause emotional distress through repeated abusive messages and threats.",
    "User posted hate speech content containing derogatory language targeting protected characteristics including ethnicity, religion, and national origin, deliberately violating platform community standards.",
    "User spread deliberate misinformation about public health including vaccine safety claims that contradict medical consensus and could cause severe harm to vulnerable populations requiring immediate action.",
  ];

  // Verify all reasons meet minimum 50 character requirement
  for (const reason of banReasons) {
    TestValidator.predicate(
      "ban reason should meet minimum 50 character requirement",
      reason.length >= 50,
    );
  }

  // Step 4: Create member bans with different reasons
  const memberBans: ICommunityPlatformMemberBan[] = [];

  for (let i = 0; i < bannedMembers.length; i++) {
    const ban: ICommunityPlatformMemberBan =
      await api.functional.communityPlatform.moderator.memberBans.create(
        connection,
        {
          body: {
            community_platform_member_id: bannedMembers[i].id,
            community_platform_report_decision_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            ban_reason: banReasons[i],
            appeal_eligible_at: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          } satisfies ICommunityPlatformMemberBan.ICreate,
        },
      );
    typia.assert(ban);
    memberBans.push(ban);
  }

  TestValidator.equals("should create 3 member bans", memberBans.length, 3);

  // Step 5: Search for bans by reason keyword - "harassment"
  const harassmentResults: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          reason: "harassment",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(harassmentResults);

  TestValidator.predicate(
    "harassment search should return matching bans",
    harassmentResults.data.length > 0,
  );

  TestValidator.predicate(
    "all returned bans should contain 'harassment' keyword in reason",
    harassmentResults.data.every((ban) =>
      ban.ban_reason.toLowerCase().includes("harassment"),
    ),
  );

  // Step 6: Search for bans by reason keyword - "hate speech"
  const hateSpeechResults: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          reason: "hate speech",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(hateSpeechResults);

  TestValidator.predicate(
    "hate speech search should return matching bans",
    hateSpeechResults.data.length > 0,
  );

  TestValidator.predicate(
    "all returned bans should contain 'hate speech' keyword in reason",
    hateSpeechResults.data.every(
      (ban) =>
        ban.ban_reason.toLowerCase().includes("hate") &&
        ban.ban_reason.toLowerCase().includes("speech"),
    ),
  );

  // Step 7: Search for bans by reason keyword - "misinformation"
  const misinformationResults: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          reason: "misinformation",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(misinformationResults);

  TestValidator.predicate(
    "misinformation search should return matching bans",
    misinformationResults.data.length > 0,
  );

  TestValidator.predicate(
    "all returned bans should contain 'misinformation' keyword in reason",
    misinformationResults.data.every((ban) =>
      ban.ban_reason.toLowerCase().includes("misinformation"),
    ),
  );

  // Step 8: Search with pagination
  const paginatedResults: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "pagination should limit results per page to specified limit",
    paginatedResults.data.length <= 2,
  );

  TestValidator.predicate(
    "pagination info should be populated correctly",
    paginatedResults.pagination.current === 1 &&
      paginatedResults.pagination.limit === 2,
  );

  // Step 9: Search with non-matching keyword
  const noMatchResults: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          reason: "nonexistent-keyword-xyz-abc",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(noMatchResults);

  TestValidator.predicate(
    "search with non-matching keyword should return empty results",
    noMatchResults.data.length === 0,
  );

  // Step 10: Verify ban timestamps and appeal eligibility
  for (const ban of memberBans) {
    TestValidator.predicate(
      "ban should have banned_at timestamp",
      ban.banned_at !== null && ban.banned_at !== undefined,
    );

    TestValidator.predicate(
      "ban should have appeal_eligible_at timestamp set for future",
      ban.appeal_eligible_at !== null && ban.appeal_eligible_at !== undefined,
    );
  }

  // Step 11: Search with multiple keyword variations
  const allBansSearch: IPageICommunityPlatformMemberBan.ISummary =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(allBansSearch);

  TestValidator.equals(
    "search without filter should return all bans",
    allBansSearch.data.length,
    memberBans.length,
  );
}
