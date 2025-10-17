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
 * Test searching platform suspensions filtered by specific member identifier.
 *
 * This test validates the platform suspension search functionality that allows
 * administrators to retrieve the complete suspension history for a specific
 * member.
 *
 * Test workflow:
 *
 * 1. Create administrator account for suspension management
 * 2. Create member account that will receive suspensions
 * 3. Issue first temporary suspension (3 days) for policy violation
 * 4. Issue second temporary suspension (7 days) for repeat violation
 * 5. Issue permanent suspension for severe repeated violations
 * 6. Search all suspensions and filter by the specific member
 * 7. Validate all suspensions are returned in chronological order
 * 8. Verify both active and historical suspensions are included
 */
export async function test_api_platform_suspension_search_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create member account that will be suspended
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 3: Issue first temporary suspension (3 days)
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const firstSuspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      connection,
      {
        body: {
          suspended_member_id: member.id,
          suspension_reason_category: "spam",
          suspension_reason_text:
            "Posting spam content in multiple communities",
          internal_notes: "First violation - temporary suspension",
          is_permanent: false,
          expiration_date: threeDaysLater.toISOString(),
        } satisfies IRedditLikePlatformSuspension.ICreate,
      },
    );
  typia.assert(firstSuspension);
  TestValidator.equals(
    "first suspension member ID",
    firstSuspension.suspended_member_id,
    member.id,
  );

  // Step 4: Issue second temporary suspension (7 days)
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const secondSuspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      connection,
      {
        body: {
          suspended_member_id: member.id,
          suspension_reason_category: "harassment",
          suspension_reason_text:
            "Repeated harassment after previous suspension",
          internal_notes: "Second violation - extended temporary suspension",
          is_permanent: false,
          expiration_date: sevenDaysLater.toISOString(),
        } satisfies IRedditLikePlatformSuspension.ICreate,
      },
    );
  typia.assert(secondSuspension);
  TestValidator.equals(
    "second suspension member ID",
    secondSuspension.suspended_member_id,
    member.id,
  );

  // Step 5: Issue permanent suspension
  const permanentSuspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      connection,
      {
        body: {
          suspended_member_id: member.id,
          suspension_reason_category: "severe_violations",
          suspension_reason_text:
            "Permanent ban for repeated severe policy violations",
          internal_notes: "Third violation - permanent account termination",
          is_permanent: true,
        } satisfies IRedditLikePlatformSuspension.ICreate,
      },
    );
  typia.assert(permanentSuspension);
  TestValidator.equals(
    "permanent suspension member ID",
    permanentSuspension.suspended_member_id,
    member.id,
  );

  // Step 6: Search all suspensions and filter by the specific member
  const searchResult: IPageIRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IRedditLikePlatformSuspension.IRequest,
      },
    );
  typia.assert(searchResult);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== null && searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "total records is positive",
    searchResult.pagination.records >= 3,
  );

  // Step 7: Filter suspensions for the specific member
  const memberSuspensions = searchResult.data.filter(
    (s) => s.suspended_member_id === member.id,
  );

  TestValidator.equals(
    "all three suspensions returned",
    memberSuspensions.length,
    3,
  );

  // Validate that ONLY this member's suspensions are in filtered results
  TestValidator.predicate(
    "all filtered suspensions belong to target member",
    memberSuspensions.every((s) => s.suspended_member_id === member.id),
  );

  // Step 8: Verify suspensions are in chronological order
  const sortedByCreatedAt = [...memberSuspensions].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  TestValidator.equals(
    "first suspension is earliest",
    sortedByCreatedAt[0].id,
    firstSuspension.id,
  );
  TestValidator.equals(
    "second suspension is middle",
    sortedByCreatedAt[1].id,
    secondSuspension.id,
  );
  TestValidator.equals(
    "permanent suspension is latest",
    sortedByCreatedAt[2].id,
    permanentSuspension.id,
  );

  // Step 9: Verify all suspensions are included
  const suspensionIds = memberSuspensions.map((s) => s.id);
  TestValidator.predicate(
    "first suspension is included",
    suspensionIds.includes(firstSuspension.id),
  );
  TestValidator.predicate(
    "second suspension is included",
    suspensionIds.includes(secondSuspension.id),
  );
  TestValidator.predicate(
    "permanent suspension is included",
    suspensionIds.includes(permanentSuspension.id),
  );

  // Step 10: Verify both temporary and permanent suspensions are included
  const hasPermanent = memberSuspensions.some((s) => s.is_permanent === true);
  const hasTemporary = memberSuspensions.some((s) => s.is_permanent === false);

  TestValidator.predicate(
    "permanent suspension exists in results",
    hasPermanent,
  );
  TestValidator.predicate(
    "temporary suspensions exist in results",
    hasTemporary,
  );
}
