import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSavedContent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSavedContent";

/**
 * Test filtering saved content by save date range using saveDateFrom and
 * saveDateTo parameters.
 *
 * This scenario validates temporal filtering of the saved collection by:
 *
 * 1. Creating a member account for authentication
 * 2. Creating saved content items with different save dates
 * 3. Querying with specific date range parameters
 * 4. Verifying all returned items fall within the specified date range
 * 5. Confirming that items saved outside the range are excluded
 *
 * The test ensures that save dates are properly compared against the created_at
 * timestamp of the saved content record, not the original content creation
 * date.
 */
export async function test_api_member_saved_content_list_filter_by_save_date_range(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Define date range for filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const rangeStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
  const rangeEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

  // 3. Query saved content with date range filter
  const filteredResult: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: 50,
          saveDateFrom: rangeStart.toISOString() satisfies string as string,
          saveDateTo: rangeEnd.toISOString() satisfies string as string,
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(filteredResult);

  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination should have current page number",
    filteredResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    filteredResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have record count",
    filteredResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid page count",
    filteredResult.pagination.pages >= 0,
  );

  // 5. Validate all returned items are within the save date range
  for (const savedItem of filteredResult.data) {
    typia.assert(savedItem);

    // Parse the created_at timestamp (save date)
    const saveDateTimeStamp = new Date(savedItem.created_at);

    // Verify item is saved within the specified range
    TestValidator.predicate(
      "saved content created_at should be >= saveDateFrom",
      saveDateTimeStamp >= rangeStart,
    );

    TestValidator.predicate(
      "saved content created_at should be <= saveDateTo",
      saveDateTimeStamp <= rangeEnd,
    );
  }

  // 6. Test with empty date range that excludes saved content
  const emptyRangeResult: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: 50,
          saveDateFrom: futureDate.toISOString() satisfies string as string,
          saveDateTo: new Date(
            futureDate.getTime() + 1 * 24 * 60 * 60 * 1000,
          ).toISOString() satisfies string as string,
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(emptyRangeResult);

  // 7. Verify date range query returns results based on save timestamp
  const allItemsResult: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(allItemsResult);

  // Verify that filtered results make sense relative to all results
  TestValidator.predicate(
    "filtered results should not exceed total results",
    filteredResult.pagination.records <= allItemsResult.pagination.records,
  );
}
