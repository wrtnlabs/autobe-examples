import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaLedger } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaLedger";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaLedger } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaLedger";

/**
 * Validates admin's ability to search, paginate, and filter the karma ledger
 * records.
 *
 * Test Flow:
 *
 * 1. Register and login as an admin (acquire authorization for admin APIs)
 * 2. Create a community using the member community creation API (admin acts as the
 *    member/creator)
 * 3. Create two+ karma ledger records as admin:
 *
 *    - One global (platform-wide) ledger for the admin as member
 *    - One community-scoped ledger for the same member/community
 * 4. Query karma ledgers using the admin-only PATCH search endpoint: a) Filter by
 *    member UUID (global + scoped both included) b) Filter by member/community
 *    UUID (scoped only) c) Filter by current_karma >=, <= to include/exclude
 *    one or both ledgers d) Test pagination (limit 1 per page)
 * 5. Assert correct paginated results in
 *    IPageICommunityPlatformKarmaLedger.ISummary & each
 *    ICommunityPlatformKarmaLedger.ISummary
 * 6. Confirm irrelevant ledgers (wrong member/community/karma) are not included
 */
export async function test_api_admin_karma_ledgers_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register and login as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create community (admin acts as member/creator)
  const communityBody = {
    name: RandomGenerator.name(2).replace(/\s/g, "_"),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create global (platform) and community-scoped ledgers for same member (admin)
  // Simulate admin's UUID also represents a member UUID for testing
  const memberId = admin.id;
  const communityId = community.id;
  const karmaGlobal = 100;
  const karmaCommunity = 789;

  const ledgerGlobal =
    await api.functional.communityPlatform.admin.karmaLedgers.create(
      connection,
      {
        body: {
          community_platform_member_id: memberId,
          current_karma: karmaGlobal,
          community_platform_community_id: null,
          feature_lock_reason: "Reached milestone",
        } satisfies ICommunityPlatformKarmaLedger.ICreate,
      },
    );
  typia.assert(ledgerGlobal);
  TestValidator.predicate(
    "global ledger has null community_platform_community_id",
    ledgerGlobal.community_platform_community_id === null,
  );
  TestValidator.equals(
    "global ledger member",
    ledgerGlobal.community_platform_member_id,
    memberId,
  );
  TestValidator.equals(
    "global ledger karma",
    ledgerGlobal.current_karma,
    karmaGlobal,
  );

  const ledgerCommunity =
    await api.functional.communityPlatform.admin.karmaLedgers.create(
      connection,
      {
        body: {
          community_platform_member_id: memberId,
          community_platform_community_id: communityId,
          current_karma: karmaCommunity,
          feature_lock_reason: null,
        } satisfies ICommunityPlatformKarmaLedger.ICreate,
      },
    );
  typia.assert(ledgerCommunity);
  TestValidator.equals(
    "community ledger member",
    ledgerCommunity.community_platform_member_id,
    memberId,
  );
  TestValidator.equals(
    "community ledger community",
    ledgerCommunity.community_platform_community_id,
    communityId,
  );
  TestValidator.equals(
    "community ledger karma",
    ledgerCommunity.current_karma,
    karmaCommunity,
  );

  // 4a. Query for both ledgers by admin memberId: both should return
  const resultByMember =
    await api.functional.communityPlatform.admin.karmaLedgers.index(
      connection,
      {
        body: {
          community_platform_member_id: memberId,
          limit: 10,
        } satisfies ICommunityPlatformKarmaLedger.IRequest,
      },
    );
  typia.assert(resultByMember);
  TestValidator.predicate(
    "result by member contains both ledgers",
    resultByMember.data.some((l) => l.id === ledgerGlobal.id) &&
      resultByMember.data.some((l) => l.id === ledgerCommunity.id),
  );

  // 4b. Filter by memberId + communityId (scoped): only the scoped ledger should match
  const resultByMemberCommunity =
    await api.functional.communityPlatform.admin.karmaLedgers.index(
      connection,
      {
        body: {
          community_platform_member_id: memberId,
          community_platform_community_id: communityId,
          limit: 10,
        } satisfies ICommunityPlatformKarmaLedger.IRequest,
      },
    );
  typia.assert(resultByMemberCommunity);
  TestValidator.equals(
    "member + community filter only community ledger",
    resultByMemberCommunity.data.length,
    1,
  );
  TestValidator.equals(
    "filtered ledger is community ledger",
    resultByMemberCommunity.data[0].id,
    ledgerCommunity.id,
  );

  // 4c. Filter by member + min_karma > global_karma, should return only community ledger
  const resultMinKarma =
    await api.functional.communityPlatform.admin.karmaLedgers.index(
      connection,
      {
        body: {
          community_platform_member_id: memberId,
          min_karma: karmaCommunity,
          limit: 10,
        } satisfies ICommunityPlatformKarmaLedger.IRequest,
      },
    );
  typia.assert(resultMinKarma);
  TestValidator.predicate(
    "min_karma > global_karma only returns community ledger",
    resultMinKarma.data.length === 1 &&
      resultMinKarma.data[0].id === ledgerCommunity.id,
  );

  // 4d. Filter by member + max_karma < community_karma, should return only global ledger
  const resultMaxKarma =
    await api.functional.communityPlatform.admin.karmaLedgers.index(
      connection,
      {
        body: {
          community_platform_member_id: memberId,
          max_karma: karmaGlobal,
          limit: 10,
        } satisfies ICommunityPlatformKarmaLedger.IRequest,
      },
    );
  typia.assert(resultMaxKarma);
  TestValidator.predicate(
    "max_karma < community_karma only returns global ledger",
    resultMaxKarma.data.length === 1 &&
      resultMaxKarma.data[0].id === ledgerGlobal.id,
  );

  // 4e. Test pagination by requesting one per page
  const resultPage1 =
    await api.functional.communityPlatform.admin.karmaLedgers.index(
      connection,
      {
        body: {
          community_platform_member_id: memberId,
          limit: 1,
          page: 1,
        } satisfies ICommunityPlatformKarmaLedger.IRequest,
      },
    );
  typia.assert(resultPage1);
  TestValidator.equals(
    "pagination: page 1, size 1",
    resultPage1.data.length,
    1,
  );

  const resultPage2 =
    await api.functional.communityPlatform.admin.karmaLedgers.index(
      connection,
      {
        body: {
          community_platform_member_id: memberId,
          limit: 1,
          page: 2,
        } satisfies ICommunityPlatformKarmaLedger.IRequest,
      },
    );
  typia.assert(resultPage2);
  TestValidator.equals(
    "pagination: page 2, size 1",
    resultPage2.data.length,
    1,
  );
  TestValidator.notEquals(
    "pagination: page 1 and page 2 ledgers are different",
    resultPage1.data[0].id,
    resultPage2.data[0].id,
  );

  // 5. Confirm querying with wrong community/member returns empty
  const wrongMemberId = typia.random<string & tags.Format<"uuid">>();
  const wrongCommunityId = typia.random<string & tags.Format<"uuid">>();
  const resultWrongMember =
    await api.functional.communityPlatform.admin.karmaLedgers.index(
      connection,
      {
        body: {
          community_platform_member_id: wrongMemberId,
          limit: 10,
        } satisfies ICommunityPlatformKarmaLedger.IRequest,
      },
    );
  typia.assert(resultWrongMember);
  TestValidator.equals(
    "wrong member, no results",
    resultWrongMember.data.length,
    0,
  );

  const resultWrongCommunity =
    await api.functional.communityPlatform.admin.karmaLedgers.index(
      connection,
      {
        body: {
          community_platform_member_id: memberId,
          community_platform_community_id: wrongCommunityId,
          limit: 10,
        } satisfies ICommunityPlatformKarmaLedger.IRequest,
      },
    );
  typia.assert(resultWrongCommunity);
  TestValidator.equals(
    "wrong community, no results",
    resultWrongCommunity.data.length,
    0,
  );
}
