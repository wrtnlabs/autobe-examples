import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformKarmaAward } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaAward";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaAward } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaAward";

/**
 * Validate admin paginated and filtered listing of karma awards (PATCH
 * /communityPlatform/admin/karmaAwards).
 *
 * 1. Register a new admin and ensure authentication.
 * 2. Create a new karma award record for a synthetic (randomly generated) member
 *    and (optionally) community.
 * 3. List awards with no filters, asserting new record present.
 * 4. List/filter by member, community, award_type, and event time window.
 * 5. Test pagination (limit to one per-page, verify next page is empty or as
 *    expected).
 * 6. Attempt to access listing while unauthenticated (should error).
 */
export async function test_api_karma_awards_pagination_and_filter_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Password123!%@", // strong password for test
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create one award
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  // Three variations for diversity
  const awardType1 = "gold";
  const awardType2 = "founder";
  const awardType3 = "legendary";

  // awards for same member/community/type, others random
  const records: ICommunityPlatformKarmaAward[] = [];
  //  1st: Gold to member and community
  {
    const award =
      await api.functional.communityPlatform.admin.karmaAwards.create(
        connection,
        {
          body: {
            community_platform_member_id: memberId,
            community_platform_community_id: communityId,
            award_type: awardType1,
            award_reason: "For outstanding contributions",
            event_time: now.toISOString(),
          } satisfies ICommunityPlatformKarmaAward.ICreate,
        },
      );
    typia.assert(award);
    records.push(award);
  }
  //  2nd: Founder to member and different community
  {
    const award =
      await api.functional.communityPlatform.admin.karmaAwards.create(
        connection,
        {
          body: {
            community_platform_member_id: memberId,
            community_platform_community_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            award_type: awardType2,
            award_reason: "Early adopter",
            event_time: now.toISOString(),
          } satisfies ICommunityPlatformKarmaAward.ICreate,
        },
      );
    typia.assert(award);
    records.push(award);
  }
  //  3rd: Legendary to other member, no community
  {
    const award =
      await api.functional.communityPlatform.admin.karmaAwards.create(
        connection,
        {
          body: {
            community_platform_member_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            // community id omitted
            award_type: awardType3,
            // no reason
            event_time: now.toISOString(),
          } satisfies ICommunityPlatformKarmaAward.ICreate,
        },
      );
    typia.assert(award);
    records.push(award);
  }
  // 3. Index w/o filters
  let res = await api.functional.communityPlatform.admin.karmaAwards.index(
    connection,
    {
      body: {} satisfies ICommunityPlatformKarmaAward.IRequest,
    },
  );
  typia.assert(res);
  TestValidator.predicate(
    "should contain at least as many records as created",
    res.data.length >= records.length,
  );
  // IDs in response
  const resultIds = res.data.map((a) => a.id);
  for (const r of records) {
    TestValidator.predicate(
      "created award visible in general index",
      resultIds.includes(r.id),
    );
  }

  // 4. Filter by member
  res = await api.functional.communityPlatform.admin.karmaAwards.index(
    connection,
    {
      body: {
        member_id: memberId,
      } satisfies ICommunityPlatformKarmaAward.IRequest,
    },
  );
  typia.assert(res);
  for (const award of res.data) {
    TestValidator.equals(
      "all returned awards are for the filtered member",
      award.community_platform_member_id,
      memberId,
    );
  }
  // 5. Filter by community
  res = await api.functional.communityPlatform.admin.karmaAwards.index(
    connection,
    {
      body: {
        community_id: communityId,
      } satisfies ICommunityPlatformKarmaAward.IRequest,
    },
  );
  typia.assert(res);
  for (const award of res.data) {
    TestValidator.equals(
      "community matches filter",
      award.community_platform_community_id,
      communityId,
    );
  }
  // 6. Filter by award type
  res = await api.functional.communityPlatform.admin.karmaAwards.index(
    connection,
    {
      body: {
        award_type: awardType2,
      } satisfies ICommunityPlatformKarmaAward.IRequest,
    },
  );
  typia.assert(res);
  for (const award of res.data) {
    TestValidator.equals(
      "award_type filter matches",
      award.award_type,
      awardType2,
    );
  }
  // 7. Filter by event_time window (all are now.toISOString())
  res = await api.functional.communityPlatform.admin.karmaAwards.index(
    connection,
    {
      body: {
        event_time_from: now.toISOString(),
        event_time_to: now.toISOString(),
      } satisfies ICommunityPlatformKarmaAward.IRequest,
    },
  );
  typia.assert(res);
  TestValidator.predicate(
    "all event_times in window",
    res.data.every((a) => a.event_time === now.toISOString()),
  );

  // 8. Pagination check
  res = await api.functional.communityPlatform.admin.karmaAwards.index(
    connection,
    {
      body: {
        limit: 1,
        page: 1,
        sort_by: "event_time",
        sort_direction: "desc",
      } satisfies ICommunityPlatformKarmaAward.IRequest,
    },
  );
  typia.assert(res);
  TestValidator.equals("pagination limit is respected", res.data.length, 1);
  if (res.pagination.pages > 1) {
    const nextPage =
      await api.functional.communityPlatform.admin.karmaAwards.index(
        connection,
        {
          body: {
            limit: 1,
            page: 2,
            sort_by: "event_time",
            sort_direction: "desc",
          } satisfies ICommunityPlatformKarmaAward.IRequest,
        },
      );
    typia.assert(nextPage);
    TestValidator.equals(
      "cardinality of page 2 matches expectations",
      nextPage.data.length,
      1,
    );
  }

  // 9. Restriction: access as unauthenticated user should fail
  // Create unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "listing requires admin authentication",
    async () => {
      await api.functional.communityPlatform.admin.karmaAwards.index(
        unauthConn,
        {
          body: {} satisfies ICommunityPlatformKarmaAward.IRequest,
        },
      );
    },
  );
}
