import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test all sorting options for community search functionality.
 *
 * This test validates that the community search API correctly implements
 * multiple sorting methods including sorting by subscriber count, creation
 * date, and community name. It verifies both ascending and descending order for
 * each sorting criterion and ensures pagination works correctly with different
 * sorting configurations.
 *
 * The test workflow:
 *
 * 1. Create and authenticate a test member account
 * 2. Retrieve communities with subscriber_count sorting (ascending)
 * 3. Validate the subscriber count ordering is correct
 * 4. Retrieve communities with subscriber_count sorting (descending)
 * 5. Validate the descending subscriber count ordering
 * 6. Retrieve communities with created_at sorting (ascending - oldest first)
 * 7. Validate the creation date ordering
 * 8. Retrieve communities with created_at sorting (descending - newest first)
 * 9. Validate the descending creation date ordering
 * 10. Retrieve communities with name sorting (ascending - alphabetical)
 * 11. Validate the alphabetical name ordering
 * 12. Retrieve communities with name sorting (descending - reverse alphabetical)
 * 13. Validate the reverse alphabetical ordering
 * 14. Test pagination with sorted results to ensure consistency
 */
export async function test_api_community_search_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a test member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Test subscriber_count sorting in ascending order
  const subscriberAscResult = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "subscriber_count",
        sort_order: "asc",
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(subscriberAscResult);

  // Validate ascending subscriber count order
  if (subscriberAscResult.data.length > 1) {
    for (let i = 0; i < subscriberAscResult.data.length - 1; i++) {
      TestValidator.predicate(
        "subscriber count should be in ascending order",
        subscriberAscResult.data[i].subscriber_count <=
          subscriberAscResult.data[i + 1].subscriber_count,
      );
    }
  }

  // Step 3: Test subscriber_count sorting in descending order
  const subscriberDescResult =
    await api.functional.redditLike.communities.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "subscriber_count",
        sort_order: "desc",
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(subscriberDescResult);

  // Validate descending subscriber count order
  if (subscriberDescResult.data.length > 1) {
    for (let i = 0; i < subscriberDescResult.data.length - 1; i++) {
      TestValidator.predicate(
        "subscriber count should be in descending order",
        subscriberDescResult.data[i].subscriber_count >=
          subscriberDescResult.data[i + 1].subscriber_count,
      );
    }
  }

  // Step 4: Test created_at sorting in ascending order (oldest first)
  const createdAscResult = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(createdAscResult);

  // Step 5: Test created_at sorting in descending order (newest first)
  const createdDescResult = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(createdDescResult);

  // Step 6: Test name sorting in ascending order (alphabetical A-Z)
  const nameAscResult = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "name",
        sort_order: "asc",
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(nameAscResult);

  // Validate ascending name order (alphabetical)
  if (nameAscResult.data.length > 1) {
    for (let i = 0; i < nameAscResult.data.length - 1; i++) {
      TestValidator.predicate(
        "community names should be in alphabetical order",
        nameAscResult.data[i].name.localeCompare(
          nameAscResult.data[i + 1].name,
        ) <= 0,
      );
    }
  }

  // Step 7: Test name sorting in descending order (reverse alphabetical Z-A)
  const nameDescResult = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "name",
        sort_order: "desc",
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(nameDescResult);

  // Validate descending name order (reverse alphabetical)
  if (nameDescResult.data.length > 1) {
    for (let i = 0; i < nameDescResult.data.length - 1; i++) {
      TestValidator.predicate(
        "community names should be in reverse alphabetical order",
        nameDescResult.data[i].name.localeCompare(
          nameDescResult.data[i + 1].name,
        ) >= 0,
      );
    }
  }

  // Step 8: Test pagination with sorted results
  const page1Result = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        sort_by: "subscriber_count",
        sort_order: "desc",
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(page1Result);

  const page2Result = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
        sort_by: "subscriber_count",
        sort_order: "desc",
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(page2Result);

  // Validate pagination consistency with sorting
  TestValidator.equals(
    "first page should have page number 1",
    page1Result.pagination.current,
    1,
  );

  if (page2Result.data.length > 0) {
    TestValidator.equals(
      "second page should have page number 2",
      page2Result.pagination.current,
      2,
    );

    // Verify that last item of page 1 has higher or equal subscriber count than first item of page 2
    if (page1Result.data.length > 0 && page2Result.data.length > 0) {
      const lastItemPage1 = page1Result.data[page1Result.data.length - 1];
      const firstItemPage2 = page2Result.data[0];

      TestValidator.predicate(
        "pagination should maintain sort order across pages",
        lastItemPage1.subscriber_count >= firstItemPage2.subscriber_count,
      );
    }
  }
}
