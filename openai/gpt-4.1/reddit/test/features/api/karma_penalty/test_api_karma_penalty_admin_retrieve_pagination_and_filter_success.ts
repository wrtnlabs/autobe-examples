import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaPenalty";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaPenalty";

/**
 * Validate admin can retrieve paginated and filtered lists of karma penalties
 * with proper metadata, sorting, status, and filter conditions.
 *
 * Steps:
 *
 * 1. Register a platform admin.
 * 2. Create at least two communities (to simulate cross-community data).
 * 3. Assign multiple penalties to several (simulated) unique members across
 *    different communities, including different penalty types/status/dates.
 * 4. Retrieve penalties by various filters: by member, by penalty type, by
 *    community, by status, by applied date, by pagination (with limited page
 *    size), and an edge case where filter yields empty results.
 * 5. Assert summary fields are correct, pagination is accurate, and filtering
 *    produces expected data (or no data for empty results).
 */
export async function test_api_karma_penalty_admin_retrieve_pagination_and_filter_success(
  connection: api.IConnection,
) {
  // Step 1: Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminResp = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "StrongPassword123!",
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminResp);

  // Step 2: Create multiple communities
  const communities = await ArrayUtil.asyncMap([0, 1], async () => {
    const req = {
      name: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(5),
      title: RandomGenerator.paragraph({ sentences: 4 }),
      description: RandomGenerator.paragraph({ sentences: 12 }),
      slug: RandomGenerator.alphaNumeric(10),
    } satisfies ICommunityPlatformCommunity.ICreate;
    const comm =
      await api.functional.communityPlatform.member.communities.create(
        connection,
        { body: req },
      );
    typia.assert(comm);
    return comm;
  });

  // Step 3: Assign multiple penalties to multiple members across those communities
  const memberIds = ArrayUtil.repeat(4, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const penaltyTypes = ["deduction", "suspension"] as const;
  const penaltyStatuses = ["active", "expired", "revoked"] as const;
  const penalties: ICommunityPlatformKarmaPenalty[] = [];
  const penaltyCount = 15;
  for (let i = 0; i < penaltyCount; ++i) {
    const memberId = RandomGenerator.pick(memberIds);
    const community = RandomGenerator.pick([undefined, ...communities]);
    const penaltyType = RandomGenerator.pick(penaltyTypes);
    const penaltyStatus = RandomGenerator.pick(penaltyStatuses);
    const appliedAt = new Date(
      Date.now() - Math.floor(Math.random() * 86400000 * 10), // Up to 10 days ago
    ).toISOString();
    const expiresAt =
      penaltyType === "suspension" && Math.random() < 0.5
        ? new Date(
            Date.parse(appliedAt) +
              86400000 * (1 + Math.floor(Math.random() * 5)),
          ).toISOString()
        : null;
    const penalty =
      await api.functional.communityPlatform.admin.karmaPenalties.create(
        connection,
        {
          body: {
            community_platform_member_id: memberId,
            community_platform_community_id: community?.id ?? null,
            penalty_type: penaltyType,
            penalty_value:
              penaltyType === "deduction"
                ? -RandomGenerator.pick([5, 10, 15])
                : RandomGenerator.pick([1, 3, 7]),
            penalty_reason: RandomGenerator.paragraph({ sentences: 6 }),
            penalty_status: penaltyStatus,
            applied_at: appliedAt,
            expires_at: expiresAt,
          } satisfies ICommunityPlatformKarmaPenalty.ICreate,
        },
      );
    typia.assert(penalty);
    penalties.push(penalty);
  }

  // Step 4: Retrieve all penalties, default sort, first page, moderate limit
  const pageLimit = 7;
  const firstPage =
    await api.functional.communityPlatform.admin.karmaPenalties.index(
      connection,
      {
        body: {
          limit: pageLimit,
          page: 0,
        } satisfies ICommunityPlatformKarmaPenalty.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "first page returns up to pageLimit results",
    firstPage.data.length <= pageLimit,
  );
  TestValidator.equals(
    "pagination meta current page",
    firstPage.pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination meta records >= data length",
    firstPage.pagination.records >= firstPage.data.length,
  );

  // Step 5: Retrieve by penalty status filter
  for (const penaltyStatus of penaltyStatuses) {
    const penaltyStatusPage =
      await api.functional.communityPlatform.admin.karmaPenalties.index(
        connection,
        {
          body: {
            penalty_status: penaltyStatus,
          } satisfies ICommunityPlatformKarmaPenalty.IRequest,
        },
      );
    typia.assert(penaltyStatusPage);
    for (const summary of penaltyStatusPage.data) {
      TestValidator.equals(
        `summary penalty_status is ${penaltyStatus}`,
        summary.penalty_status,
        penaltyStatus,
      );
    }
  }

  // Step 6: Retrieve by penalty type filter
  for (const penaltyType of penaltyTypes) {
    const penaltyTypePage =
      await api.functional.communityPlatform.admin.karmaPenalties.index(
        connection,
        {
          body: {
            penalty_type: penaltyType,
          } satisfies ICommunityPlatformKarmaPenalty.IRequest,
        },
      );
    typia.assert(penaltyTypePage);
    for (const summary of penaltyTypePage.data) {
      TestValidator.equals(
        `summary penalty_type is ${penaltyType}`,
        summary.penalty_type,
        penaltyType,
      );
    }
  }

  // Step 7: Retrieve by community id
  for (const community of communities) {
    const pageByCommunity =
      await api.functional.communityPlatform.admin.karmaPenalties.index(
        connection,
        {
          body: {
            community_id: community.id,
          } satisfies ICommunityPlatformKarmaPenalty.IRequest,
        },
      );
    typia.assert(pageByCommunity);
    for (const summary of pageByCommunity.data) {
      TestValidator.equals(
        `summary community_platform_community_id match request`,
        summary.community_platform_community_id,
        community.id,
      );
    }
  }

  // Step 8: Retrieve by member id (random sample)
  const randomMemberId = RandomGenerator.pick(memberIds);
  const memberPage =
    await api.functional.communityPlatform.admin.karmaPenalties.index(
      connection,
      {
        body: {
          member_id: randomMemberId,
        } satisfies ICommunityPlatformKarmaPenalty.IRequest,
      },
    );
  typia.assert(memberPage);
  for (const summary of memberPage.data) {
    TestValidator.equals(
      "summary community_platform_member_id matches request",
      summary.community_platform_member_id,
      randomMemberId,
    );
  }

  // Step 9: Retrieve with sorting (descending by applied_at)
  const sortedDescPage =
    await api.functional.communityPlatform.admin.karmaPenalties.index(
      connection,
      {
        body: {
          sort_by: "applied_at",
          sort_direction: "desc",
        } satisfies ICommunityPlatformKarmaPenalty.IRequest,
      },
    );
  typia.assert(sortedDescPage);
  for (let i = 1; i < sortedDescPage.data.length; ++i) {
    TestValidator.predicate(
      "applied_at is non-increasing",
      Date.parse(sortedDescPage.data[i - 1].applied_at) >=
        Date.parse(sortedDescPage.data[i].applied_at),
    );
  }

  // Step 10: Date range filter that returns an empty result (very early range)
  const emptyDatePage =
    await api.functional.communityPlatform.admin.karmaPenalties.index(
      connection,
      {
        body: {
          applied_from: new Date(2000, 0, 1).toISOString(),
          applied_to: new Date(2000, 0, 2).toISOString(),
        } satisfies ICommunityPlatformKarmaPenalty.IRequest,
      },
    );
  typia.assert(emptyDatePage);
  TestValidator.equals(
    "no penalties in ancient date range",
    emptyDatePage.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is zero when result empty",
    emptyDatePage.pagination.records,
    0,
  );
}
