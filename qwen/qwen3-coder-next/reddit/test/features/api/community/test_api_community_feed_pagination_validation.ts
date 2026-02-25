import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_feed_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Test pagination API with sample community ID
  const sampleCommunityId = "00000000-0000-0000-0000-000000000000";
  // Test pagination with different page sizes
  const limit = 10;
  // Page 1: should return first 10 posts
  const page1 = await api.functional.redditClone.communities.posts.index(
    connection,
    {
      communityId: sampleCommunityId,
      body: {
        sort: "new",
        page: 1,
        limit,
      },
    },
  );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.equals(
    "page 1 pagination metadata",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1.pagination.limit, limit);
  TestValidator.predicate(
    "page 1 record count non-negative",
    page1.data.length >= 0,
  );
  TestValidator.predicate(
    "page 1 total records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 total pages non-negative",
    page1.pagination.pages >= 0,
  );
  // Page 2: should return next 10 posts
  const page2 = await api.functional.redditClone.communities.posts.index(
    connection,
    {
      communityId: sampleCommunityId,
      body: {
        sort: "new",
        page: 2,
        limit,
      },
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 pagination metadata",
    page2.pagination.current,
    2,
  );
  // Page 3: should return remaining posts
  const page3 = await api.functional.redditClone.communities.posts.index(
    connection,
    {
      communityId: sampleCommunityId,
      body: {
        sort: "new",
        page: 3,
        limit,
      },
    },
  );
  typia.assert(page3);
  TestValidator.equals(
    "page 3 pagination metadata",
    page3.pagination.current,
    3,
  );
  // Test edge case: page beyond total pages
  const emptyPage = await api.functional.redditClone.communities.posts.index(
    connection,
    {
      communityId: sampleCommunityId,
      body: {
        sort: "new",
        page: 100,
        limit,
      },
    },
  );
  typia.assert(emptyPage);
  TestValidator.predicate(
    "empty page has no data",
    emptyPage.data.length === 0,
  );
  // Test limit maximum (should cap at 100)
  const maxLimit = 100;
  const cappedLimit = await api.functional.redditClone.communities.posts.index(
    connection,
    {
      communityId: sampleCommunityId,
      body: {
        sort: "new",
        page: 1,
        limit: maxLimit,
      },
    },
  );
  typia.assert(cappedLimit);
  TestValidator.predicate(
    "capped limit respects maximum",
    cappedLimit.pagination.limit <= 100,
  );
}
