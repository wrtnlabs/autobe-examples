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
 * Test filtering and retrieving active platform suspensions.
 *
 * This test validates the platform suspension search functionality by:
 *
 * 1. Creating an administrator account with suspension management privileges
 * 2. Creating multiple member accounts to suspend
 * 3. Issuing various types of suspensions (temporary and permanent)
 * 4. Searching for active suspensions with the is_active filter
 * 5. Validating search results contain only active suspensions
 * 6. Verifying pagination support and complete suspension details
 */
export async function test_api_platform_suspension_search_active_suspensions(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create multiple member accounts to be suspended
  const memberCount = 5;
  const members: IRedditLikeMember.IAuthorized[] = await ArrayUtil.asyncRepeat(
    memberCount,
    async (index) => {
      const memberData = {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate;

      const member: IRedditLikeMember.IAuthorized =
        await api.functional.auth.member.join(connection, {
          body: memberData,
        });
      typia.assert(member);
      return member;
    },
  );

  // Step 3: Issue various types of suspensions
  const suspensionCategories = [
    "spam",
    "harassment",
    "hate_speech",
    "illegal_content",
    "ban_evasion",
  ] as const;

  // Create 3 permanent suspensions
  const permanentSuspensions: IRedditLikePlatformSuspension[] =
    await ArrayUtil.asyncRepeat(3, async (index) => {
      const suspensionData = {
        suspended_member_id: members[index].id,
        suspension_reason_category: suspensionCategories[index],
        suspension_reason_text: RandomGenerator.paragraph({ sentences: 2 }),
        internal_notes: RandomGenerator.paragraph({ sentences: 1 }),
        is_permanent: true,
        expiration_date: undefined,
      } satisfies IRedditLikePlatformSuspension.ICreate;

      const suspension: IRedditLikePlatformSuspension =
        await api.functional.redditLike.admin.platform.suspensions.create(
          connection,
          { body: suspensionData },
        );
      typia.assert(suspension);
      return suspension;
    });

  // Create 2 temporary suspensions with future expiration dates
  const temporarySuspensions: IRedditLikePlatformSuspension[] =
    await ArrayUtil.asyncRepeat(2, async (index) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7 * (index + 1)); // 7 and 14 days from now

      const suspensionData = {
        suspended_member_id: members[index + 3].id,
        suspension_reason_category: suspensionCategories[index + 3],
        suspension_reason_text: RandomGenerator.paragraph({ sentences: 2 }),
        internal_notes: RandomGenerator.paragraph({ sentences: 1 }),
        is_permanent: false,
        expiration_date: futureDate.toISOString(),
      } satisfies IRedditLikePlatformSuspension.ICreate;

      const suspension: IRedditLikePlatformSuspension =
        await api.functional.redditLike.admin.platform.suspensions.create(
          connection,
          { body: suspensionData },
        );
      typia.assert(suspension);
      return suspension;
    });

  // Step 4: Search for active suspensions only
  const searchRequest = {
    page: 1,
    limit: 10,
    is_active: true,
  } satisfies IRedditLikePlatformSuspension.IRequest;

  const activeSuspensionsPage: IPageIRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(activeSuspensionsPage);

  // Step 5: Validate search results contain only active suspensions
  TestValidator.predicate(
    "all returned suspensions are active",
    activeSuspensionsPage.data.every(
      (suspension) => suspension.is_active === true,
    ),
  );

  // Step 6: Verify all created suspensions are in the results
  const expectedCount =
    permanentSuspensions.length + temporarySuspensions.length;
  TestValidator.equals(
    "active suspension count matches created suspensions",
    activeSuspensionsPage.data.length,
    expectedCount,
  );

  // Step 7: Verify pagination metadata
  typia.assert(activeSuspensionsPage.pagination);
  TestValidator.equals(
    "current page is 1",
    activeSuspensionsPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 10",
    activeSuspensionsPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records is at least expected count",
    activeSuspensionsPage.pagination.records >= expectedCount,
  );

  // Step 8: Verify complete suspension details are included
  const firstSuspension = activeSuspensionsPage.data[0];
  typia.assert(firstSuspension);

  TestValidator.predicate(
    "suspension has ID",
    firstSuspension.id !== undefined && firstSuspension.id.length > 0,
  );
  TestValidator.predicate(
    "suspension has member ID",
    firstSuspension.suspended_member_id !== undefined,
  );
  TestValidator.predicate(
    "suspension has reason category",
    firstSuspension.suspension_reason_category !== undefined,
  );
  TestValidator.predicate(
    "suspension has reason text",
    firstSuspension.suspension_reason_text !== undefined,
  );
  TestValidator.predicate(
    "suspension has is_permanent flag",
    typeof firstSuspension.is_permanent === "boolean",
  );
  TestValidator.predicate(
    "suspension has is_active flag",
    firstSuspension.is_active === true,
  );
  TestValidator.predicate(
    "suspension has created_at timestamp",
    firstSuspension.created_at !== undefined,
  );

  // Step 9: Test filtering by permanence
  const permanentOnlyRequest = {
    page: 1,
    limit: 10,
    is_active: true,
    is_permanent: true,
  } satisfies IRedditLikePlatformSuspension.IRequest;

  const permanentSuspensionsPage: IPageIRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: permanentOnlyRequest,
      },
    );
  typia.assert(permanentSuspensionsPage);

  TestValidator.predicate(
    "all returned suspensions are permanent and active",
    permanentSuspensionsPage.data.every(
      (s) => s.is_permanent === true && s.is_active === true,
    ),
  );

  // Step 10: Test filtering by temporary suspensions
  const temporaryOnlyRequest = {
    page: 1,
    limit: 10,
    is_active: true,
    is_permanent: false,
  } satisfies IRedditLikePlatformSuspension.IRequest;

  const temporarySuspensionsPage: IPageIRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: temporaryOnlyRequest,
      },
    );
  typia.assert(temporarySuspensionsPage);

  TestValidator.predicate(
    "all returned suspensions are temporary and active",
    temporarySuspensionsPage.data.every(
      (s) => s.is_permanent === false && s.is_active === true,
    ),
  );

  // Step 11: Verify temporary suspensions have expiration dates
  temporarySuspensionsPage.data.forEach((suspension) => {
    TestValidator.predicate(
      "temporary suspension has expiration date",
      suspension.expiration_date !== undefined &&
        suspension.expiration_date !== null,
    );
  });
}
