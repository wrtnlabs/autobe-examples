import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaPenalty";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaPenalty";

/**
 * Validate moderator-scoped retrieval of karma penalties with filtering,
 * sorting, and pagination.
 *
 * 1. Create two communities (A, B).
 * 2. Register a moderator for Community A.
 * 3. Generate member emails and use them as unique member IDs for penalty
 *    assignment (no member create API provided).
 * 4. Apply several penalties via admin API:
 *
 *    - Some for members in Community A (under moderator's scope)
 *    - Some for members in Community B (outside moderator's scope)
 * 5. Authenticate as moderator for Community A.
 * 6. Retrieve penalties with:
 *
 *    - No filters: Confirm only Community A penalties are present.
 *    - Filter by penalty_status: Confirm only matching status entries shown.
 *    - Filter by member_id: Confirm only matching member's penalties show (within
 *         scope).
 *    - Filter by penalty_type: Confirm penalty type filtering works.
 *    - Pagination: Page and limit constraints, and edge-of-data.
 *    - Unauthorized scope: Try to retrieve penalties specifically for Community B.
 * 7. Confirm all business logic and scope constraints hold.
 */
export async function test_api_karma_penalty_moderator_retrieve_pagination_and_scope(
  connection: api.IConnection,
) {
  // 1. Create two communities (A, B)
  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 20,
            sentenceMax: 25,
          }),
          slug: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 20,
            sentenceMax: 25,
          }),
          slug: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);

  // 2. Register a moderator for Community A
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "password1234!",
        community_id: communityA.id,
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  typia.assert(moderator);

  // 3. Generate synthetic member ids (simulate with random UUIDs)
  const membersA = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const membersB = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // 4. Apply several penalties under both communities
  // Types + statuses pool
  const penaltyTypes = ["deduction", "suspension", "warning"] as const;
  const penaltyStatusPool = ["active", "expired", "revoked"] as const;

  const penaltiesA: ICommunityPlatformKarmaPenalty[] = await ArrayUtil.asyncMap(
    membersA,
    async (member_id, idx) => {
      const penalty: ICommunityPlatformKarmaPenalty =
        await api.functional.communityPlatform.admin.karmaPenalties.create(
          connection,
          {
            body: {
              community_platform_member_id: member_id,
              community_platform_community_id: communityA.id,
              penalty_type: RandomGenerator.pick(penaltyTypes),
              penalty_value: RandomGenerator.pick([-5, -10, 3]),
              penalty_reason: RandomGenerator.paragraph({ sentences: 3 }),
              penalty_status: RandomGenerator.pick(penaltyStatusPool),
              applied_at: new Date().toISOString(),
              expires_at:
                idx % 2 === 0
                  ? new Date(Date.now() + 10 * 86400000).toISOString()
                  : null,
            } satisfies ICommunityPlatformKarmaPenalty.ICreate,
          },
        );
      typia.assert(penalty);
      return penalty;
    },
  );

  const penaltiesB: ICommunityPlatformKarmaPenalty[] = await ArrayUtil.asyncMap(
    membersB,
    async (member_id, idx) => {
      const penalty: ICommunityPlatformKarmaPenalty =
        await api.functional.communityPlatform.admin.karmaPenalties.create(
          connection,
          {
            body: {
              community_platform_member_id: member_id,
              community_platform_community_id: communityB.id,
              penalty_type: RandomGenerator.pick(penaltyTypes),
              penalty_value: RandomGenerator.pick([-2, -6, 5]),
              penalty_reason: RandomGenerator.paragraph({ sentences: 2 }),
              penalty_status: RandomGenerator.pick(penaltyStatusPool),
              applied_at: new Date().toISOString(),
              expires_at:
                idx % 2
                  ? new Date(Date.now() + 2 * 86400000).toISOString()
                  : null,
            } satisfies ICommunityPlatformKarmaPenalty.ICreate,
          },
        );
      typia.assert(penalty);
      return penalty;
    },
  );

  // 5. Authenticate as moderator for Community A (token management handled by SDK)
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "password1234!",
      community_id: communityA.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // 6. Penalty queries

  // --- (a) Unfiltered query: Should return only Community A penalties ---
  const pageA =
    await api.functional.communityPlatform.moderator.karmaPenalties.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformKarmaPenalty.IRequest,
      },
    );
  typia.assert(pageA);
  // Sanity check: Only Community A penalty IDs present
  TestValidator.predicate(
    "community scope enforcement",
    pageA.data.every(
      (p) => p.community_platform_community_id === communityA.id,
    ),
  );

  // --- (b) Filter by penalty_status ---
  for (const status of penaltyStatusPool) {
    const filtered =
      await api.functional.communityPlatform.moderator.karmaPenalties.index(
        connection,
        {
          body: {
            penalty_status: status,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformKarmaPenalty.IRequest,
        },
      );
    typia.assert(filtered);
    TestValidator.predicate(
      `status filtering - ${status}`,
      filtered.data.every(
        (p) =>
          p.penalty_status === status &&
          p.community_platform_community_id === communityA.id,
      ),
    );
  }
  // --- (c) Filter by member_id ---
  for (const memberIdA of membersA) {
    const filtered =
      await api.functional.communityPlatform.moderator.karmaPenalties.index(
        connection,
        {
          body: {
            member_id: memberIdA,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformKarmaPenalty.IRequest,
        },
      );
    typia.assert(filtered);
    TestValidator.predicate(
      `member id filtering - ${memberIdA}`,
      filtered.data.every(
        (p) =>
          p.community_platform_member_id === memberIdA &&
          p.community_platform_community_id === communityA.id,
      ),
    );
  }
  // --- (d) Filter by penalty_type ---
  for (const penaltyType of penaltyTypes) {
    const filtered =
      await api.functional.communityPlatform.moderator.karmaPenalties.index(
        connection,
        {
          body: {
            penalty_type: penaltyType,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformKarmaPenalty.IRequest,
        },
      );
    typia.assert(filtered);
    TestValidator.predicate(
      `penalty type filtering (${penaltyType})`,
      filtered.data.every(
        (p) =>
          p.penalty_type === penaltyType &&
          p.community_platform_community_id === communityA.id,
      ),
    );
  }
  // --- (e) Pagination behavior ---
  const paged1 =
    await api.functional.communityPlatform.moderator.karmaPenalties.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformKarmaPenalty.IRequest,
      },
    );
  typia.assert(paged1);
  const paged2 =
    await api.functional.communityPlatform.moderator.karmaPenalties.index(
      connection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies ICommunityPlatformKarmaPenalty.IRequest,
      },
    );
  typia.assert(paged2);
  TestValidator.notEquals("pagination pages differ", paged1.data, paged2.data);

  // --- (f) Sort check: sort_by, sort_direction ---
  const sortedAsc =
    await api.functional.communityPlatform.moderator.karmaPenalties.index(
      connection,
      {
        body: {
          sort_by: "applied_at",
          sort_direction: "asc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaPenalty.IRequest,
      },
    );
  typia.assert(sortedAsc);
  TestValidator.predicate(
    "applied_at ascending order",
    sortedAsc.data.every(
      (p, i, arr) => i === 0 || arr[i - 1].applied_at <= p.applied_at,
    ),
  );
  const sortedDesc =
    await api.functional.communityPlatform.moderator.karmaPenalties.index(
      connection,
      {
        body: {
          sort_by: "applied_at",
          sort_direction: "desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaPenalty.IRequest,
      },
    );
  typia.assert(sortedDesc);
  TestValidator.predicate(
    "applied_at descending order",
    sortedDesc.data.every(
      (p, i, arr) => i === 0 || arr[i - 1].applied_at >= p.applied_at,
    ),
  );
  // --- (g) Unauthorized scope: filter by Community B ---
  const outOfScope =
    await api.functional.communityPlatform.moderator.karmaPenalties.index(
      connection,
      {
        body: {
          community_id: communityB.id,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaPenalty.IRequest,
      },
    );
  typia.assert(outOfScope);
  TestValidator.equals(
    "penalties for unauthorized community not accessible",
    outOfScope.data.length,
    0,
  );
}
