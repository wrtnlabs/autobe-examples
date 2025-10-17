import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePlatformSuspension";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";

/**
 * Test searching and filtering platform suspensions.
 *
 * This test validates the platform suspension search and filtering
 * functionality. It creates an administrator account, issues multiple
 * suspensions with different characteristics (permanent vs temporary, different
 * reasons), then searches and filters suspensions using available query
 * parameters including pagination, active status filtering, and permanence
 * filtering.
 *
 * Process:
 *
 * 1. Create administrator account for suspension management
 * 2. Create multiple member accounts to suspend
 * 3. Issue permanent and temporary suspensions
 * 4. Search and paginate through all suspensions
 * 5. Filter suspensions by active status
 * 6. Filter suspensions by permanence type
 * 7. Validate pagination and filtering accuracy
 */
export async function test_api_platform_suspension_search_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create multiple member accounts to suspend
  const members: IRedditLikeMember.IAuthorized[] = await ArrayUtil.asyncRepeat(
    6,
    async () => {
      const member = await api.functional.auth.member.join(connection, {
        body: {
          username: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<20> &
              tags.Pattern<"^[a-zA-Z0-9_-]+$">
          >(),
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.MinLength<8>>(),
        } satisfies IRedditLikeMember.ICreate,
      });
      typia.assert(member);
      return member;
    },
  );

  // Step 3: Issue mix of permanent and temporary suspensions
  const permanentSuspensions: IRedditLikePlatformSuspension[] = [];
  const temporarySuspensions: IRedditLikePlatformSuspension[] = [];

  // Create 3 permanent suspensions
  for (let i = 0; i < 3; i++) {
    const suspension =
      await api.functional.redditLike.admin.platform.suspensions.create(
        connection,
        {
          body: {
            suspended_member_id: members[i].id,
            suspension_reason_category: RandomGenerator.pick([
              "spam",
              "harassment",
              "hate_speech",
            ] as const),
            suspension_reason_text: RandomGenerator.paragraph({ sentences: 2 }),
            internal_notes: RandomGenerator.paragraph({ sentences: 1 }),
            is_permanent: true,
          } satisfies IRedditLikePlatformSuspension.ICreate,
        },
      );
    typia.assert(suspension);
    permanentSuspensions.push(suspension);
  }

  // Create 3 temporary suspensions
  for (let i = 3; i < 6; i++) {
    const suspension =
      await api.functional.redditLike.admin.platform.suspensions.create(
        connection,
        {
          body: {
            suspended_member_id: members[i].id,
            suspension_reason_category: RandomGenerator.pick([
              "spam",
              "inappropriate_content",
              "violation",
            ] as const),
            suspension_reason_text: RandomGenerator.paragraph({ sentences: 2 }),
            internal_notes: RandomGenerator.paragraph({ sentences: 1 }),
            is_permanent: false,
            expiration_date: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          } satisfies IRedditLikePlatformSuspension.ICreate,
        },
      );
    typia.assert(suspension);
    temporarySuspensions.push(suspension);
  }

  const allCreatedSuspensions = [
    ...permanentSuspensions,
    ...temporarySuspensions,
  ];

  // Step 4: Search all suspensions with pagination
  const allSuspensionsPage: IPageIRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditLikePlatformSuspension.IRequest,
      },
    );
  typia.assert(allSuspensionsPage);

  // Verify all created suspensions are present
  const foundSuspensions = allSuspensionsPage.data.filter((s) =>
    allCreatedSuspensions.some((created) => created.id === s.id),
  );

  TestValidator.equals(
    "all created suspensions should be retrievable",
    foundSuspensions.length,
    allCreatedSuspensions.length,
  );

  // Step 5: Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be 1",
    allSuspensionsPage.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination should have valid limit",
    allSuspensionsPage.pagination.limit === 100,
  );

  TestValidator.predicate(
    "pagination records should include our suspensions",
    allSuspensionsPage.pagination.records >= allCreatedSuspensions.length,
  );

  TestValidator.predicate(
    "pagination pages calculation should be valid",
    allSuspensionsPage.pagination.pages >= 1,
  );

  // Step 6: Test filtering by active status
  const activeSuspensionsPage: IPageIRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          is_active: true,
        } satisfies IRedditLikePlatformSuspension.IRequest,
      },
    );
  typia.assert(activeSuspensionsPage);

  TestValidator.predicate(
    "all returned suspensions should be active when filtered",
    activeSuspensionsPage.data.every((s) => s.is_active === true),
  );

  // Verify our active suspensions are included
  const ourActiveSuspensions = activeSuspensionsPage.data.filter((s) =>
    allCreatedSuspensions.some((created) => created.id === s.id),
  );

  TestValidator.predicate(
    "our suspensions should be active and included in active filter",
    ourActiveSuspensions.length === allCreatedSuspensions.length,
  );

  // Step 7: Test filtering by permanence - permanent suspensions
  const permanentPage: IPageIRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          is_permanent: true,
        } satisfies IRedditLikePlatformSuspension.IRequest,
      },
    );
  typia.assert(permanentPage);

  TestValidator.predicate(
    "all returned suspensions should be permanent when filtered",
    permanentPage.data.every((s) => s.is_permanent === true),
  );

  const ourPermanentInResults = permanentPage.data.filter((s) =>
    permanentSuspensions.some((created) => created.id === s.id),
  );

  TestValidator.equals(
    "all our permanent suspensions should be in filtered results",
    ourPermanentInResults.length,
    permanentSuspensions.length,
  );

  // Step 8: Test filtering by permanence - temporary suspensions
  const temporaryPage: IPageIRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          is_permanent: false,
        } satisfies IRedditLikePlatformSuspension.IRequest,
      },
    );
  typia.assert(temporaryPage);

  TestValidator.predicate(
    "all returned suspensions should be temporary when filtered",
    temporaryPage.data.every((s) => s.is_permanent === false),
  );

  const ourTemporaryInResults = temporaryPage.data.filter((s) =>
    temporarySuspensions.some((created) => created.id === s.id),
  );

  TestValidator.equals(
    "all our temporary suspensions should be in filtered results",
    ourTemporaryInResults.length,
    temporarySuspensions.length,
  );

  // Step 9: Test combined filtering - active and permanent
  const activePermanentPage: IPageIRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          is_active: true,
          is_permanent: true,
        } satisfies IRedditLikePlatformSuspension.IRequest,
      },
    );
  typia.assert(activePermanentPage);

  TestValidator.predicate(
    "combined filter should return only active permanent suspensions",
    activePermanentPage.data.every(
      (s) => s.is_active === true && s.is_permanent === true,
    ),
  );

  // Step 10: Test pagination with smaller limit
  const smallLimitPage: IPageIRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 3,
        } satisfies IRedditLikePlatformSuspension.IRequest,
      },
    );
  typia.assert(smallLimitPage);

  TestValidator.predicate(
    "page should respect limit parameter",
    smallLimitPage.data.length <= 3,
  );

  TestValidator.equals(
    "pagination limit should match request",
    smallLimitPage.pagination.limit,
    3,
  );
}
